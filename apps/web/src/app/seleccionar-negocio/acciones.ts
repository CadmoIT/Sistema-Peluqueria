/** Selecciona únicamente una membresía activa de la cuenta autenticada. */
"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import { COOKIE_NEGOCIO } from "@/servicios/contexto-equipo.service";
export async function seleccionarNegocio(datos: FormData) {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });
  if (!sesion) redirect("/acceder");
  const m = await prisma.membresia.findFirst({
    where: {
      negocioId: String(datos.get("negocioId")),
      usuarioId: sesion.user.id,
      activo: true,
    },
    include: { profesional: true },
  });
  if (
    !m ||
    (m.rol === "PROFESIONAL" &&
      (!sesion.user.emailVerified || !m.aceptadaEn || !m.profesional?.activo))
  )
    throw new Error("El negocio no está disponible para tu cuenta.");
  (await cookies()).set(COOKIE_NEGOCIO, m.negocioId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  redirect("/panel/resumen");
}
