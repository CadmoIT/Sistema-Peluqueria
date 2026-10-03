/** Confirma la incorporación al equipo sin aceptar por una visita o previsualización de correo. */
"use client";
import { useActionState } from "react";
import { aceptar } from "@/app/invitaciones/[token]/acciones";
export function AceptarInvitacion({ token }: { token: string }) {
  const [estado, accion, pendiente] = useActionState(aceptar, { mensaje: "" });
  return (
    <form action={accion}>
      <input type="hidden" name="token" value={token} />
      <button disabled={pendiente} type="submit" className="boton">
        {pendiente ? "Uniéndote…" : "Aceptar y unirme al equipo"}
      </button>
      <p role="status">{estado.mensaje}</p>
    </form>
  );
}
