/** Inicia el consentimiento independiente de Google Calendar para el negocio autenticado. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import {
  crearUrlGoogleCalendar,
  googleCalendarConfigurado,
} from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { fechaValida } from "@/componentes/panel/agenda/agenda-modelo";

export async function GET(solicitud: Request) {
  const url = new URL(solicitud.url);
  const fecha = url.searchParams.get("fecha") ?? "";
  if (!googleCalendarConfigurado())
    return NextResponse.redirect(
      new URL(
        `/panel/agenda?google=no-configurado${fechaValida(fecha) ? `&fecha=${fecha}` : ""}`,
        solicitud.url,
      ),
    );
  const sesion = await autenticacion.api.getSession({
    headers: solicitud.headers,
  });
  if (!sesion)
    return NextResponse.redirect(
      new URL("/acceder?modo=ingreso", solicitud.url),
    );
  const profesionalId = url.searchParams.get("profesionalId");
  const sedeId = url.searchParams.get("sedeId");
  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId: sesion.user.id, activo: true },
  });
  if (!membresia)
    return NextResponse.redirect(new URL("/primeros-pasos", solicitud.url));
  if (
    profesionalId &&
    !(await prisma.profesional.findFirst({
      where: { id: profesionalId, negocioId: membresia.negocioId },
    }))
  )
    return NextResponse.json(
      { mensaje: "Profesional inválido" },
      { status: 400 },
    );
  if (
    sedeId &&
    !(await prisma.sede.findFirst({
      where: { id: sedeId, negocioId: membresia.negocioId },
    }))
  )
    return NextResponse.json({ mensaje: "Sede inválida" }, { status: 400 });
  return NextResponse.redirect(
    crearUrlGoogleCalendar({
      usuarioId: sesion.user.id,
      negocioId: membresia.negocioId,
      profesionalId,
      sedeId,
      expira: Date.now() + 10 * 60_000,
      fecha: fechaValida(fecha) ? fecha : undefined,
    }),
  );
}
