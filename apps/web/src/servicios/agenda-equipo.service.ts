/** Modifica disponibilidad sin invalidar turnos ni solapar trabajo entre sucursales. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { estaDentroDelHorario, type Jornada } from "./disponibilidad.service";
import {
  exigirProfesionalEquipo,
  exigirSedeEquipo,
} from "@/lib/permisos-equipo";
import type { ContextoEquipo } from "./contexto-equipo.service";
import { transaccionEquipo } from "./transaccion-equipo";
import { registrarActividadEquipo } from "./actividad-equipo.service";
export async function guardarHorarioEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  profesionalId: string,
  sedeId: string,
  horarios: Jornada[],
) {
  exigirProfesionalEquipo(c, profesionalId);
  exigirSedeEquipo(c, sedeId);
  if (
    horarios.length > 7 ||
    new Set(horarios.map((h) => h.diaSemana)).size !== horarios.length ||
    horarios.some(
      (h) =>
        !Number.isInteger(h.diaSemana) ||
        h.diaSemana < 0 ||
        h.diaSemana > 6 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.comienza) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.termina) ||
        h.comienza >= h.termina,
    )
  )
    throw new Error("Elegí días y horarios válidos.");
  return transaccionEquipo(
    db,
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${profesionalId} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
      if (
        !(await tx.profesionalSede.findFirst({
          where: {
            profesionalId,
            sedeId,
            profesional: { negocioId: c.negocio.id, activo: true },
            sede: { negocioId: c.negocio.id, activa: true },
          },
        }))
      )
        throw new Error("No estás asignado a ese local.");
      const apertura = await tx.horarioSede.findMany({
        where: { negocioId: c.negocio.id, sedeId, activo: true },
      });
      if (
        horarios.some(
          (h) =>
            !apertura.some(
              (a) =>
                a.diaSemana === h.diaSemana &&
                a.abre <= h.comienza &&
                a.cierra >= h.termina,
            ),
        )
      )
        throw new Error(
          "Tu horario debe estar dentro del horario de apertura del local.",
        );
      const otros = await tx.horarioProfesional.findMany({
        where: {
          negocioId: c.negocio.id,
          profesionalId,
          sedeId: { not: sedeId },
        },
      });
      if (
        horarios.some((h) =>
          otros.some(
            (o) =>
              o.diaSemana === h.diaSemana &&
              h.comienza < o.termina &&
              h.termina > o.comienza,
          ),
        )
      )
        throw new Error(
          "Ese horario se superpone con tu trabajo en otro local.",
        );
      const turnos = await tx.reserva.findMany({
        where: {
          negocioId: c.negocio.id,
          profesionalId,
          sedeId,
          fin: { gt: new Date() },
          estado: { notIn: ["CANCELADA", "VENCIDA"] },
        },
        select: { inicio: true, fin: true },
      });
      if (
        turnos.some(
          (t) =>
            !estaDentroDelHorario(
              t.inicio,
              t.fin,
              horarios,
              c.negocio.zonaHoraria,
            ),
        )
      )
        throw new Error(
          "Hay turnos existentes fuera del nuevo horario. Reprogramalos antes de cambiar tu jornada.",
        );
      await tx.horarioProfesional.deleteMany({
        where: { profesionalId, sedeId, negocioId: c.negocio.id },
      });
      await tx.horarioProfesional.createMany({
        data: horarios.map((h) => ({
          ...h,
          profesionalId,
          sedeId,
          negocioId: c.negocio.id,
        })),
      });
      await registrarActividadEquipo(tx, c, {
        accion: "CAMBIAR_HORARIO",
        recurso: "profesional",
        recursoId: profesionalId,
        sedeId,
        profesionalId,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function bloquearAgendaEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  e: { profesionalId: string; inicio: Date; fin: Date; motivo: string },
) {
  exigirProfesionalEquipo(c, e.profesionalId);
  if (
    !Number.isFinite(e.inicio.getTime()) ||
    !Number.isFinite(e.fin.getTime()) ||
    e.inicio >= e.fin ||
    !e.motivo.trim() ||
    e.motivo.length > 200
  )
    throw new Error("Revisá las fechas y el motivo del bloqueo.");
  return transaccionEquipo(
    db,
    async (tx) => {
      const p = await tx.profesional.findFirst({
        where: { id: e.profesionalId, negocioId: c.negocio.id, activo: true },
      });
      if (!p) throw new Error("El profesional no está disponible.");
      if (
        await tx.reserva.count({
          where: {
            negocioId: c.negocio.id,
            profesionalId: p.id,
            estado: { notIn: ["CANCELADA", "VENCIDA"] },
            inicio: { lt: e.fin },
            fin: { gt: e.inicio },
          },
        })
      )
        throw new Error(
          "El bloqueo afecta turnos existentes. Reprogramalos antes.",
        );
      const b = await tx.bloqueoAgenda.create({
        data: { negocioId: c.negocio.id, ...e },
      });
      await registrarActividadEquipo(tx, c, {
        accion: "BLOQUEAR_AGENDA",
        recurso: "profesional",
        recursoId: b.id,
        profesionalId: p.id,
      });
    },
    { isolationLevel: "Serializable" },
  );
}
