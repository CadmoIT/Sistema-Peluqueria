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
    precioBase: string;
    medioFijado: string | null;
    descuentoEfectivo: number;
  } | null>(null);
  const [idempotencia, setId] = useState("");
  const [medio, setMedio] = useState("TARJETA_EXTERNA");
  const [error, setError] = useState(false);
  useEffect(() => {
    let cerrado = false;
    setId(crypto.randomUUID());
    void fetch(`/api/panel/turnos/${encodeURIComponent(reservaId)}/saldo`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cerrado) {
          setSaldo(d);
          if (d?.medioFijado) setMedio(d.medioFijado);
          if (!d) setError(true);
        }
      })
      .catch(() => {
        if (!cerrado) setError(true);
      });
    return () => {
      cerrado = true;
    };
  }, [reservaId]);
  if (!saldo)
    return (
      <p>
        {error
          ? "No pudimos consultar el saldo. Cerrá y volvé a abrir el turno."
          : "Consultando saldo del turno…"}
      </p>
    );
  const total = saldo.medioFijado
    ? Number(saldo.total)
    : Math.round(
        Number(saldo.precioBase) *
          (medio === "EFECTIVO" ? 1 - saldo.descuentoEfectivo / 100 : 1) *
          100,
      ) / 100;
  const pendiente = Math.max(
    0,
    Math.round((total - Number(saldo.abonado)) * 100) / 100,
  );
  return (
    <section>
      <h3>Cobros del turno</h3>
      <p>
        Precio base: ${saldo.precioBase} · Total: ${total} · Abonado: $
        {saldo.abonado} · Pendiente: ${pendiente}
      </p>
      {pendiente > 0 && (
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
              max={pendiente}
            />
          </label>
          <label>
            Medio
            <select
              name="medio"
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
            >
              <option
                value="EFECTIVO"
                disabled={
                  !!saldo.medioFijado && saldo.medioFijado !== "EFECTIVO"
                }
              >
                Efectivo · −{saldo.descuentoEfectivo}%
              </option>
              <option
                value="TRANSFERENCIA"
                disabled={saldo.medioFijado === "EFECTIVO"}
              >
                Transferencia recibida
              </option>
              <option
                value="TARJETA_EXTERNA"
                disabled={saldo.medioFijado === "EFECTIVO"}
              >
                Tarjeta
              </option>
              <option
                value="MERCADO_PAGO"
                disabled={saldo.medioFijado === "EFECTIVO"}
              >
                Mercado Pago
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
