/** Actualiza bajo demanda los calendarios conectados del negocio autenticado. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import {
  sincronizarConexionGoogle,
  sincronizarTurnosGoogle,
  googleCalendarConfigurado,
} from "@/lib/google-calendar";
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
    return NextResponse.json({ mensaje: "Sesión requerida" }, { status: 401 });
  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId: sesion.user.id, activo: true },
  });
  if (!membresia)
    return NextResponse.json({ mensaje: "Negocio requerido" }, { status: 403 });
  if (!googleCalendarConfigurado())
    return NextResponse.json(
      { ok: false, mensaje: "Google Calendar todavía no está configurado." },
      { status: 503 },
    );
  const cuerpo = await solicitud.json().catch(() => ({}));
  const conexionId =
    typeof cuerpo.conexionId === "string" ? cuerpo.conexionId : undefined;
  const conexiones = await prisma.conexionGoogleCalendar.findMany({
    where: {
      negocioId: membresia.negocioId,
      ...(conexionId ? { id: conexionId } : {}),
      estado: { in: ["ACTIVA", "ERROR"] },
    },
  });
  if (!conexiones.length)
    return NextResponse.json(
      { ok: false, mensaje: "No hay un calendario conectado." },
      { status: 404 },
    );
  const resultados = await Promise.all(
    conexiones.map(async (conexion) => {
      const ok = await sincronizarConexionGoogle(conexion.id);
      if (ok) await sincronizarTurnosGoogle(conexion.id);
      const actual = await prisma.conexionGoogleCalendar.findUnique({
        where: { id: conexion.id },
        select: { ultimoError: true },
      });
      return ok && !actual?.ultimoError;
    }),
  );
  const ok = resultados.every(Boolean);
  return NextResponse.json(
    {
      ok,
      mensaje: ok
        ? "Google Calendar quedó actualizado."
        : "No pudimos sincronizar. Reconectá la misma cuenta o intentá nuevamente.",
      sincronizadas: conexiones.length,
    },
    { status: ok ? 200 : 502 },
  );
}
