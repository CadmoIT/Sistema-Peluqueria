/** Desconecta sólo un calendario propio sin borrar eventos de la cuenta de Google. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
export async function POST(solicitud: Request) {
  if (solicitud.headers.get("origin") !== new URL(solicitud.url).origin)
    return NextResponse.json(
      { ok: false, mensaje: "Origen inválido." },
      { status: 403 },
    );
  const sesion = await autenticacion.api.getSession({
    headers: solicitud.headers,
  });
  if (!sesion)
    return NextResponse.json(
      { ok: false, mensaje: "Iniciá sesión para continuar." },
      { status: 401 },
    );
  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId: sesion.user.id, activo: true },
  });
  const cuerpo = await solicitud.json().catch(() => ({}));
  if (!membresia || typeof cuerpo.conexionId !== "string")
    return NextResponse.json(
      { ok: false, mensaje: "Calendario inválido." },
      { status: 400 },
    );
  const conexion = await prisma.conexionGoogleCalendar.findFirst({
    where: { id: cuerpo.conexionId, negocioId: membresia.negocioId },
  });
  if (!conexion)
    return NextResponse.json(
      { ok: false, mensaje: "Calendario no encontrado." },
      { status: 404 },
    );
  await prisma.$transaction([
    prisma.conexionGoogleCalendar.update({
      where: { id: conexion.id },
      data: {
        estado: "PENDIENTE",
        accessTokenCifrado: null,
        refreshTokenCifrado: null,
        syncToken: null,
        ultimoError: null,
      },
    }),
    prisma.eventoCalendarioExterno.updateMany({
      where: { conexionId: conexion.id },
      data: { cancelado: true },
    }),
  ]);
  return NextResponse.json({
    ok: true,
    mensaje: "Calendario desconectado. Los eventos de Google se conservaron.",
  });
}
