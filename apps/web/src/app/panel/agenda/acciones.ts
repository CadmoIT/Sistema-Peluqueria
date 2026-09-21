/** Crea y reprograma turnos con aislamiento y control de superposiciones. */
"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { sincronizarReservaEnGoogle } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { fechaLocalAUtc } from "@/servicios/disponibilidad.service";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { fechaValida } from "@/componentes/panel/agenda/agenda-modelo";

export type ResultadoNuevoTurno = { ok: boolean; mensaje: string };
export async function crearReservaPanel(
  _anterior: ResultadoNuevoTurno,
  datos: FormData,
): Promise<ResultadoNuevoTurno> {
  try {
    await guardarReservaPanel(datos);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT;")
    )
      throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        ok: false,
        mensaje:
          error.code === "P2034"
            ? "Ese horario acaba de cambiar. Revisá la agenda e intentá nuevamente."
            : "No pudimos guardar el turno. Intentá nuevamente.",
      };
    }
    return {
      ok: false,
      mensaje:
        error instanceof Error
          ? error.message
          : "No pudimos crear el turno. Intentá nuevamente.",
    };
  }
  const fechaAgenda = leerTexto(datos, "fechaAgenda");
  redirect(
    `/panel/agenda?agenda=creado${fechaValida(fechaAgenda) ? `&fecha=${fechaAgenda}` : ""}`,
  );
}
async function guardarReservaPanel(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const profesionalId = leerTexto(datos, "profesionalId");
  const sedeId = leerTexto(datos, "sedeId");
  const servicioId = leerTexto(datos, "servicioId");
  const fechaHoraLocal = leerTexto(datos, "inicio");
  const observacion = textoOpcional(
    leerTexto(datos, "observacion").slice(0, 500),
  );
  const inicio = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fechaHoraLocal)
    ? fechaLocalAUtc(
        fechaHoraLocal.slice(0, 10),
        fechaHoraLocal.slice(11),
        negocio.zonaHoraria,
      )
    : new Date(NaN);
  const [servicio, profesional, sede] = await Promise.all([
    prisma.servicio.findFirst({
      where: {
        id: servicioId,
        negocioId: negocio.id,
        activo: true,
      },
    }),
    prisma.profesional.findFirst({
      where: {
        id: profesionalId,
        negocioId: negocio.id,
        activo: true,
      },
    }),
    prisma.sede.findFirst({
      where: {
        id: sedeId,
        negocioId: negocio.id,
        activa: true,
      },
    }),
  ]);

  if (!servicio || !profesional || !sede || Number.isNaN(inicio.getTime())) {
    throw new Error(
      "El servicio, la sede, el profesional o la fecha no son válidos.",
    );
  }

  const fin = new Date(
    inicio.getTime() +
      (servicio.duracionMinutos + servicio.bufferMinutos) * 60_000,
  );
  await validarHorarioLaboral({
    negocioId: negocio.id,
    sedeId,
    profesionalId,
    inicio,
    fin,
    zonaHoraria: negocio.zonaHoraria,
  });

  const reserva = await prisma.$transaction(
    async (tx) => {
      const superpuesta = await tx.reserva.findFirst({
        where: {
          negocioId: negocio.id,
          profesionalId,
          estado: { notIn: ["CANCELADA", "VENCIDA"] },
          inicio: { lt: fin },
          fin: { gt: inicio },
        },
      });

      const bloqueoGoogle = await tx.eventoCalendarioExterno.findFirst({
        where: {
          cancelado: false,
          conexion: {
            negocioId: negocio.id,
            OR: [
              { profesionalId: profesional.id },
              { profesionalId: null, sedeId: sede.id },
              { profesionalId: null, sedeId: null },
            ],
          },
          inicio: { lt: fin },
          fin: { gt: inicio },
        },
      });

      if (superpuesta || bloqueoGoogle) {
        throw new Error("Ese horario ya está ocupado.");
      }

      const clienteId = leerTexto(datos, "clienteId");
      const cliente = clienteId
        ? await tx.cliente.findFirst({
            where: { id: clienteId, negocioId: negocio.id },
          })
        : await tx.cliente.create({
            data: {
              negocioId: negocio.id,
              nombre: textoOpcional(leerTexto(datos, "clienteNombre")),
            },
          });

      if (!cliente) throw new Error("El cliente elegido no es válido.");

      return tx.reserva.create({
        data: {
          negocioId: negocio.id,
          profesionalId,
          sedeId,
          clienteId: cliente.id,
          codigo: randomUUID().slice(0, 8).toUpperCase(),
          estado: "CONFIRMADA",
          inicio,
          fin,
          total: servicio.precio,
          sena: 0,
          notas: observacion,
          servicios: {
            create: {
              servicioId,
              orden: 1,
              precio: servicio.precio,
              duracionMinutos: servicio.duracionMinutos,
            },
          },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  after(() => sincronizarReservaEnGoogle(reserva.id));

  revalidatePath("/panel");
  revalidatePath("/panel/agenda");
}

export async function moverReserva(
  id: string,
  inicioIso: string,
  finIso: string,
) {
  const { negocio } = await requerirContextoPanel();
  const inicio = new Date(inicioIso);
  const fin = new Date(finIso);
  const reserva = await prisma.reserva.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (
    !reserva ||
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fin.getTime()) ||
    fin <= inicio
  ) {
    throw new Error("El turno o las fechas no son válidos.");
  }
  if (!reserva.profesionalId || !reserva.clienteId) throw new Error("Este turno conserva una ficha eliminada y no puede reprogramarse.");
  await validarHorarioLaboral({
    negocioId: negocio.id,
    sedeId: reserva.sedeId,
    profesionalId: reserva.profesionalId,
    inicio,
    fin,
    zonaHoraria: negocio.zonaHoraria,
  });

  const superpuesta = await prisma.reserva.findFirst({
    where: {
      negocioId: negocio.id,
      profesionalId: reserva.profesionalId,
      id: { not: id },
      estado: { notIn: ["CANCELADA", "VENCIDA"] },
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
  });

  if (superpuesta) {
    throw new Error("El nuevo horario se superpone con otro turno.");
  }

  const bloqueoGoogle = await prisma.eventoCalendarioExterno.findFirst({
    where: {
      cancelado: false,
      conexion: {
        negocioId: negocio.id,
        OR: [
          { profesionalId: reserva.profesionalId },
          { profesionalId: null, sedeId: reserva.sedeId },
          { profesionalId: null, sedeId: null },
        ],
      },
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
  });

  if (bloqueoGoogle) {
    throw new Error("El nuevo horario está ocupado en Google Calendar.");
  }

  await prisma.$transaction(
    async (tx) => {
      const conflicto = await tx.reserva.findFirst({
        where: {
          negocioId: negocio.id,
          profesionalId: reserva.profesionalId,
          id: { not: id },
          estado: { notIn: ["CANCELADA", "VENCIDA"] },
          inicio: { lt: fin },
          fin: { gt: inicio },
        },
      });
      if (conflicto)
        throw new Error("El nuevo horario se superpone con otro turno.");
      await tx.reserva.update({ where: { id }, data: { inicio, fin } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  after(() => sincronizarReservaEnGoogle(id));
  revalidatePath("/panel/agenda");
}

const transicionesPermitidas = {
  BORRADOR: ["CONFIRMADA", "CANCELADA"],
  RETENIDA: ["CONFIRMADA", "CANCELADA"],
  PENDIENTE_PAGO: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["COMPLETADA", "AUSENTE", "CANCELADA"],
  COMPLETADA: [],
  AUSENTE: [],
  CANCELADA: [],
  VENCIDA: [],
} as const;

export async function cambiarEstadoReserva(id: string, nuevoEstado: string) {
  const { negocio } = await requerirContextoPanel();
  const reserva = await prisma.reserva.findFirst({
    where: { id, negocioId: negocio.id },
    select: { estado: true },
  });

  if (!reserva) throw new Error("El turno no existe.");

  const permitidos = transicionesPermitidas[
    reserva.estado
  ] as readonly string[];
  if (!permitidos.includes(nuevoEstado)) {
    throw new Error("Ese cambio de estado no está permitido.");
  }

  await prisma.reserva.update({
    where: { id },
    data: {
      estado: nuevoEstado as
        "CONFIRMADA" | "COMPLETADA" | "AUSENTE" | "CANCELADA",
    },
  });
  after(() => sincronizarReservaEnGoogle(id));

  revalidatePath("/panel");
  revalidatePath("/panel/agenda");
}

async function validarHorarioLaboral({
  negocioId,
  sedeId,
  profesionalId,
  inicio,
  fin,
  zonaHoraria,
}: {
  negocioId: string;
  sedeId: string;
  profesionalId: string;
  inicio: Date;
  fin: Date;
  zonaHoraria: string;
}) {
  const inicioLocal = partesLocales(inicio, zonaHoraria);
  const finLocal = partesLocales(fin, zonaHoraria);
  if (inicioLocal.fecha !== finLocal.fecha) {
    throw new Error("El turno debe comenzar y terminar el mismo día.");
  }

  const [horariosLocal, horariosProfesional, bloqueo] = await Promise.all([
    prisma.horarioSede.findMany({
      where: { negocioId, sedeId, diaSemana: inicioLocal.dia, activo: true },
    }),
    prisma.horarioProfesional.findMany({
      where: { negocioId, sedeId, profesionalId },
    }),
    prisma.bloqueoAgenda.findFirst({
      where: {
        negocioId,
        profesionalId,
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
    }),
  ]);
  const contiene = (horario: {
    abre?: string;
    cierra?: string;
    comienza?: string;
    termina?: string;
  }) =>
    inicioLocal.hora >= (horario.abre ?? horario.comienza ?? "") &&
    finLocal.hora <= (horario.cierra ?? horario.termina ?? "");

  if (!horariosLocal.some(contiene)) {
    throw new Error("El local está cerrado en ese horario.");
  }
  if (
    horariosProfesional.length &&
    !horariosProfesional.some(
      (h) => h.diaSemana === inicioLocal.dia && contiene(h),
    )
  ) {
    throw new Error("El profesional no trabaja en ese horario.");
  }
  if (bloqueo) {
    throw new Error("El profesional tiene ese horario bloqueado.");
  }
}

function partesLocales(fecha: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  const dias: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dia: dias[valor("weekday")],
    fecha: valor("year") + "-" + valor("month") + "-" + valor("day"),
    hora: valor("hour") + ":" + valor("minute"),
  };
}
