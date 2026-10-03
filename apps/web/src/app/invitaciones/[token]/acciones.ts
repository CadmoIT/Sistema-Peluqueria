/** La aceptación es una escritura explícita; visitar el enlace no concede acceso. */
"use server";
import { mensajeErrorEquipo } from "@/lib/errores-equipo";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import { COOKIE_NEGOCIO } from "@/servicios/contexto-equipo.service";
import { aceptarInvitacionEquipo } from "@/servicios/invitaciones-equipo.service";
export async function aceptar(_estado: { mensaje: string }, datos: FormData) {
  const s = await autenticacion.api.getSession({ headers: await headers() });
  if (!s) return { mensaje: "Ingresá para aceptar la invitación." };
  let negocioId: string;
  try {
    negocioId = await aceptarInvitacionEquipo(
      prisma,
      String(datos.get("token")),
      s.user,
    );
  } catch (e) {
    return { mensaje: mensajeErrorEquipo(e) };
  }
  (await cookies()).set(COOKIE_NEGOCIO, negocioId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  redirect("/panel/resumen");
}
