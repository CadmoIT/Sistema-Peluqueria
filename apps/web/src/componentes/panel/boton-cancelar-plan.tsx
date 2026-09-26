/** Confirma y envía la cancelación autenticada de la suscripción actual. */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotonCancelarPlan() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function cancelar() {
    if (!window.confirm("¿Querés cancelar tu plan actual?")) return;
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch(
        "/api/v1/facturacion/suscripciones/cancelar",
        {
          method: "POST",
        },
      );
      if (!respuesta.ok) throw new Error("No pudimos cancelar el plan.");
      router.refresh();
    } catch (motivo) {
      setError(
        motivo instanceof Error
          ? motivo.message
          : "No pudimos cancelar el plan.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="facturacion-cancelacion__accion">
      <button
        type="button"
        className="boton-cancelar-plan"
        onClick={cancelar}
        disabled={cargando}
      >
        {cargando ? "Cancelando…" : "Cancelar"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
