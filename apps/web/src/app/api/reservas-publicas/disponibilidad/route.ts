/** Calcula horarios públicos libres a partir de jornadas, bloqueos y reservas reales. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  diaSemanaLocal,
  fechaLocalAUtc,
  sumarDias,
} from "@/servicios/disponibilidad.service";

export async function GET(solicitud: Request) {
  const parametros = new URL(solicitud.url).searchParams;
  const slug = parametros.get("slug") ?? "";
  const servicioId = parametros.get("servicioId") ?? "";
  const sedeId = parametros.get("sedeId") ?? "";
  const profesionalId = parametros.get("profesionalId") ?? "";
  const fecha = parametros.get("fecha") ?? "";

  if (
    !slug ||
    !servicioId ||
    !sedeId ||
    !profesionalId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return NextResponse.json(
      { mensaje: "La consulta está incompleta." },
      { status: 400 },
    );
  }

  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    include: { suscripcion: true },
  });
  if (!negocio || !negocio.publicado || pruebaVencida(negocio.suscripcion)) {
    return NextResponse.json(
      { mensaje: "El sitio no está disponible." },
      { status: 404 },
    );
  }

  const [servicio, profesional, sede] = await Promise.all([
    prisma.servicio.findFirst({
      where: {
        id: servicioId,
        negocioId: negocio.id,
        activo: true,
        sedes: { some: { sedeId } },
        profesionales: { some: { profesionalId } },
      },
    }),
    prisma.profesional.findFirst({
      where: {
        id: profesionalId,
        negocioId: negocio.id,
        activo: true,
        sedes: { some: { sedeId } },
        servicios: { some: { servicioId } },
      },
      include: { horarios: { where: { sedeId } } },
    }),
    prisma.sede.findFirst({
      where: { id: sedeId, negocioId: negocio.id, activa: true },
      include: { horarios: true },
    }),
  ]);

  if (!servicio || !profesional || !sede) {
    return NextResponse.json(
      { mensaje: "La selección no está disponible." },
      { status: 400 },
    );
  }

  const diaSemana = diaSemanaLocal(fecha, negocio.zonaHoraria);
  const jornadasProfesional = profesional.horarios.filter(
    (horario) => horario.diaSemana === diaSemana,
  );
  const jornadasSede = sede.horarios.filter(
    (horario) => horario.activo && horario.diaSemana === diaSemana,
  );
  if (!jornadasProfesional.length) return NextResponse.json({ horarios: [] });

  const inicioDia = fechaLocalAUtc(fecha, "00:00", negocio.zonaHoraria);
  const finDia = fechaLocalAUtc(
    sumarDias(fecha, 1),
    "00:00",
    negocio.zonaHoraria,
  );
  const [reservas, bloqueos, externos] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        negocioId: negocio.id,
        profesionalId,
        estado: { notIn: ["CANCELADA", "VENCIDA"] },
        inicio: { lt: finDia },
        fin: { gt: inicioDia },
      },
      select: { inicio: true, fin: true },
    }),
    prisma.bloqueoAgenda.findMany({
      where: {
        negocioId: negocio.id,
        profesionalId,
        inicio: { lt: finDia },
        fin: { gt: inicioDia },
      },
      select: { inicio: true, fin: true },
    }),
    prisma.eventoCalendarioExterno.findMany({
      where: {
        cancelado: false,
        conexion: {
          negocioId: negocio.id,
          OR: [{ profesionalId }, { profesionalId: null, sedeId }, { profesionalId: null, sedeId: null }],
        },
        inicio: { lt: finDia },
        fin: { gt: inicioDia },
      },
      select: { inicio: true, fin: true },
    }),
  ]);
  const ocupaciones = [...reservas, ...bloqueos, ...externos];
  const duracion = servicio.duracionMinutos + servicio.bufferMinutos;
  const horarios: Array<{ inicio: string; etiqueta: string }> = [];

  for (const jornada of jornadasProfesional) {
    const aperturaSede = jornadasSede.length
      ? jornadasSede.reduce(
          (mayor, actual) => (actual.abre > mayor ? actual.abre : mayor),
          "00:00",
        )
      : jornada.comienza;
    const cierreSede = jornadasSede.length
      ? jornadasSede.reduce(
          (menor, actual) => (actual.cierra < menor ? actual.cierra : menor),
          "23:59",
        )
      : jornada.termina;
    const desde =
      jornada.comienza > aperturaSede ? jornada.comienza : aperturaSede;
    const hasta = jornada.termina < cierreSede ? jornada.termina : cierreSede;

    for (
      let minutos = aMinutos(desde);
      minutos + duracion <= aMinutos(hasta);
      minutos += 30
    ) {
      const hora = aHora(minutos);
      const inicio = fechaLocalAUtc(fecha, hora, negocio.zonaHoraria);
      const fin = new Date(inicio.getTime() + duracion * 60_000);
      const libre = ocupaciones.every(
        (ocupacion) => ocupacion.inicio >= fin || ocupacion.fin <= inicio,
      );
      if (libre && inicio.getTime() > Date.now() + 15 * 60_000) {
        horarios.push({ inicio: inicio.toISOString(), etiqueta: hora });
      }
    }
  }

  return NextResponse.json({ horarios });
}

function pruebaVencida(
  suscripcion: {
    estado: string;
    pruebaFinalizaEn: Date | null;
    graciaHasta: Date | null;
  } | null,
) {
  return (
    suscripcion?.estado === "PAUSADA" ||
    suscripcion?.estado === "CANCELADA" ||
    (suscripcion?.estado === "EN_GRACIA" &&
      !!suscripcion.graciaHasta &&
      suscripcion.graciaHasta < new Date()) ||
    (suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
      !!suscripcion.pruebaFinalizaEn &&
      suscripcion.pruebaFinalizaEn < new Date())
  );
}

function aMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas! * 60 + minutos!;
}

function aHora(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
