/** Permite distinguir negocios homónimos sin abrir la personalización a todos. */
"use client";
import { useActionState } from "react";
import { actualizarSubdominio } from "@/app/panel/mi-sitio/acciones";
import "./editor-subdominio.css";

export function EditorSubdominio({
  actual,
  dominio,
  soloLectura,
}: {
  actual: string;
  dominio: string;
  soloLectura: boolean;
}) {
  const [resultado, accion, pendiente] = useActionState(actualizarSubdominio, {
    ok: false,
    mensaje: "",
  });
  return (
    <section className="editor-subdominio" aria-label="Dirección del sitio">
      <h2>Una dirección para distinguir tu negocio</h2>
      <p>
        Otro negocio tiene el mismo nombre. Por eso podés elegir una dirección
        disponible; tus enlaces anteriores seguirán funcionando.
      </p>
      <form action={accion}>
        <label>
          Subdominio{" "}
          <input
            name="subdominio"
            defaultValue={actual}
            required
            minLength={2}
            maxLength={63}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            autoCapitalize="none"
            spellCheck={false}
            disabled={soloLectura || pendiente}
          />
          <small>.{dominio}</small>
        </label>
        <button
          className="boton boton--secundario"
          disabled={soloLectura || pendiente}
        >
          {pendiente ? "Guardando…" : "Guardar dirección"}
        </button>
      </form>
      {resultado.mensaje && <p role="status">{resultado.mensaje}</p>}
    </section>
  );
}
