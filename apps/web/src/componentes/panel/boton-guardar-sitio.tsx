/** Envía el formulario del editor aunque el botón esté ubicado en la cabecera. */
"use client";

import { useState } from "react";
import { toast } from "sonner";

export function BotonGuardarSitio() {
  const [pendiente, setPendiente] = useState(false);

  async function guardar() {
    const formulario = document.getElementById("form-editor-sitio");
    if (!(formulario instanceof HTMLFormElement) || pendiente) return;
    setPendiente(true);
    try {
      const respuesta = await fetch("/api/panel/mi-sitio", {
        method: "POST",
        body: new FormData(formulario),
      });
      if (!respuesta.ok) throw new Error("No se pudo guardar");
      toast.success("El borrador quedó guardado.");
    } catch {
      toast.error("No pudimos guardar los cambios del sitio.");
    } finally {
      setPendiente(false);
    }
  }

  return (
    <button
      type="button"
      className="boton mi-sitio-guardar"
      onClick={guardar}
      disabled={pendiente}
      aria-busy={pendiente}
    >
      {pendiente ? "Guardando…" : "Guardar"}
    </button>
  );
}
