/** Consulta saldo autorizado y registra un cobro manual sin procesar dinero externo. */
"use client";
import { useEffect, useState } from "react";
import { FormularioAccion } from "../formulario-accion";
import { registrarCobro } from "@/app/panel/actividad/acciones";
export function CobroTurno({ reservaId }: { reservaId: string }) {
  const [saldo, setSaldo] = useState<{
    total: string;
    abonado: string;
    pendiente: string;
  } | null>(null);
  const [idempotencia, setId] = useState("");
  useEffect(() => {
    let cerrado = false;
    setId(crypto.randomUUID());
    void fetch(`/api/panel/turnos/${encodeURIComponent(reservaId)}/saldo`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cerrado) setSaldo(d);
      });
    return () => {
      cerrado = true;
    };
  }, [reservaId]);
  if (!saldo) return <p>Consultando saldo del turno…</p>;
  return (
    <section>
      <h3>Cobros del turno</h3>
      <p>
        Total: ${saldo.total} · Abonado: ${saldo.abonado} · Pendiente: $
        {saldo.pendiente}
      </p>
      {Number(saldo.pendiente) > 0 && (
        <FormularioAccion
          accion={registrarCobro}
          texto="Registrar cobro"
          className="formulario-apilado"
          alGuardar={() => {
            setId(crypto.randomUUID());
            void fetch(`/api/panel/turnos/${reservaId}/saldo`, {
              cache: "no-store",
            })
              .then((r) => r.json())
              .then(setSaldo);
          }}
        >
          <input type="hidden" name="reservaId" value={reservaId} />
          <input type="hidden" name="idempotencia" value={idempotencia} />
          <label>
            Importe
            <input
              required
              name="monto"
              type="number"
              min="0.01"
              step="0.01"
              max={saldo.pendiente}
            />
          </label>
          <label>
            Medio
            <select name="medio">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia recibida</option>
              <option value="TARJETA_EXTERNA">
                Tarjeta cobrada fuera del sistema
              </option>
            </select>
          </label>
          <small>
            Registrar no procesa un pago. Comprobá que recibiste el dinero.
          </small>
        </FormularioAccion>
      )}
    </section>
  );
}
