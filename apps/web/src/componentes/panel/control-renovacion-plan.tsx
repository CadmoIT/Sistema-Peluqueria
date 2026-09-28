/** Permite activar o pausar la renovación sin quitar el período ya pagado. */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { inicialmenteActiva: boolean };

export function ControlRenovacionPlan({ inicialmenteActiva }: Props) {
  const [activa, setActiva] = useState(inicialmenteActiva);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function cambiarEstado() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch(
        "/api/v1/facturacion/suscripciones/renovacion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activa: !activa }),
        },
      );
      const resultado = (await respuesta.json().catch(() => null)) as
        | { mensaje?: string; activa?: boolean }
        | null;
      if (!respuesta.ok) {
        throw new Error(resultado?.mensaje ?? "No pudimos actualizar la renovación.");
      }
      setActiva(Boolean(resultado?.activa));
      router.refresh();
    } catch (motivo) {
      setError(
        motivo instanceof Error
          ? motivo.message
          : "No pudimos actualizar la renovación.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="facturacion-renovacion__control">
      <button
        aria-checked={activa}
        aria-label="Renovación automática"
        className="control-renovacion"
        disabled={cargando}
        onClick={cambiarEstado}
        role="switch"
        type="button"
      >
        <span className="control-renovacion__punto" />
      </button>
      <span aria-live="polite">
        {cargando ? "Actualizando…" : activa ? "Activada" : "Desactivada"}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
