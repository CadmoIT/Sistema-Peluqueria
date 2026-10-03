/** Edita únicamente el perfil autenticado, sin tocar la ficha profesional ni el negocio. */
"use client";
import { useState } from "react";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";
export function DatosCuentaPersonal({ nombre }: { nombre: string }) {
  const [pendiente, setPendiente] = useState(false),
    [mensaje, setMensaje] = useState("");
  return (
    <form
      className="formulario-apilado"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pendiente) return;
        const name = String(
          new FormData(e.currentTarget).get("nombre") ?? "",
        ).trim();
        if (!name || name.length > 100) {
          setMensaje("Ingresá un nombre de hasta 100 caracteres.");
          return;
        }
        setPendiente(true);
        try {
          const r = await clienteAutenticacion.updateUser({ name });
          setMensaje(
            r.error
              ? "No pudimos guardar tus datos."
              : "Nombre actualizado en tu cuenta personal.",
          );
        } catch {
          setMensaje("No pudimos guardar tus datos.");
        } finally {
          setPendiente(false);
        }
      }}
    >
      <label>
        Mi nombre
        <input name="nombre" required maxLength={100} defaultValue={nombre} />
      </label>
      <button disabled={pendiente} className="boton boton--primario">
        {pendiente ? "Guardando…" : "Guardar mis datos"}
      </button>
      <p role="status">{mensaje}</p>
    </form>
  );
}
