/** Guarda los valores actuales y publica el sitio en una sola acción. */
"use client";

import { useState } from "react";
import { toast } from "sonner";

export function BotonPublicarSitio() {
  const [pendiente, setPendiente] = useState(false);

  async function publicar() {
    const formulario = document.getElementById("form-editor-sitio");
    if (!(formulario instanceof HTMLFormElement) || pendiente) return;
    setPendiente(true);
    try {
      const respuesta = await fetch("/api/panel/mi-sitio?publicar=1", {
        method: "POST",
        body: new FormData(formulario),
      });
      if (!respuesta.ok) throw new Error("No se pudo publicar");
      toast.success("Tu sitio quedó publicado.");
    } catch {
      toast.error("No pudimos publicar los cambios del sitio.");
    } finally {
      setPendiente(false);
    }
  }

  return (
    <button
      type="button"
      className="boton mi-sitio-publicar__boton"
      onClick={publicar}
      disabled={pendiente}
      aria-busy={pendiente}
    >
      {pendiente ? "Publicando…" : "Publicar cambios"}
    </button>
  );
}
