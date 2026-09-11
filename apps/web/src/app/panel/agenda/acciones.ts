/** Crea y reprograma turnos con aislamiento y control de superposiciones. */
"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { sincronizarReservaEnGoogle } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function crearReservaPanel(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const profesionalId = leerTexto(datos, "profesionalId");
  const sedeId = leerTexto(datos, "sedeId");
  const servicioId = leerTexto(datos, "servicioId");
  const inicio = new Date(leerTexto(datos, "inicio"));
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
    Number.isNaN(fin.getTime())
  ) {
    throw new Error("El turno o las fechas no son válidos.");
  }

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
        ],
      },
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
  });

  if (bloqueoGoogle) {
    throw new Error("El nuevo horario está ocupado en Google Calendar.");
  }

  await prisma.reserva.update({
    where: { id },
    data: { inicio, fin },
  });
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
