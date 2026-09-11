/** Actualiza bajo demanda los calendarios conectados del negocio autenticado. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { sincronizarConexionGoogle } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function POST(solicitud: Request) {
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
  const conexiones = await prisma.conexionGoogleCalendar.findMany({
    where: {
      negocioId: membresia.negocioId,
      estado: { in: ["ACTIVA", "ERROR"] },
    },
  });
  await Promise.all(
    conexiones.map((conexion) => sincronizarConexionGoogle(conexion.id)),
  );
  return NextResponse.json({ sincronizadas: conexiones.length });
}
