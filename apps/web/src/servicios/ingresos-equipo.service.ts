/** Suma señas aprobadas de reservas sin mezclar pagos de suscripción ni duplicar cobros manuales. */
import { prisma } from "@/lib/prisma";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { ContextoEquipo } from "./contexto-equipo.service";
export async function senasRegistradas(
  c: ContextoEquipo,
  desde: Date,
  hasta?: Date,
  sedeId?: string,
  profesionalId?: string | null,
) {
  const reservas = {
    negocioId: c.negocio.id,
    AND: [
      {
        ...(sedeId ? { sedeId } : {}),
        ...(profesionalId !== undefined ? { profesionalId } : {}),
      },
      c.identidad.rol === "PROFESIONAL"
        ? {
            profesionalId: c.identidad.profesionalId,
            sedeId: { in: c.identidad.sedeIds },
          }
        : {},
    ],
  };
  const pagos = await prisma.pago.findMany({
    where: {
      negocioId: c.negocio.id,
      reservaId: { not: null },
      suscripcionId: null,
      estado: "APROBADO",
      pagadoEn: { gte: desde, ...(hasta ? { lt: hasta } : {}) },
      reserva: reservas,
    },
    select: {
      id: true,
      monto: true,
      pagadoEn: true,
      reserva: { select: { sedeId: true, profesionalId: true, codigo: true } },
    },
  });
  return pagos
    .filter((p) => p.reserva)
    .map((p) => ({
      id: `proveedor:${p.id}`,
      negocioId: c.negocio.id,
      sedeId: p.reserva!.sedeId,
      profesionalId: p.reserva!.profesionalId,
      origen: p.reserva!.profesionalId
        ? ("EQUIPO" as const)
        : ("LOCAL" as const),
      tipo: "INGRESO" as const,
      creadoEn: p.pagadoEn!,
      monto: p.monto,
      concepto: `Seña aprobada · ${p.reserva!.codigo}`,
      actorUsuarioId: null,
      operacionId: `proveedor:${p.id}`,
      reversaDeId: null,
    }));
}
export async function saldoPendienteEquipo(
  c: ContextoEquipo,
  sedeId?: string,
  db: PrismaClient = prisma,
) {
  const reservas = await db.reserva.findMany({
    where: {
      negocioId: c.negocio.id,
      estado: { in: ["CONFIRMADA", "COMPLETADA", "AUSENTE"] },
      AND: [
        sedeId ? { sedeId } : {},
        c.identidad.rol === "PROFESIONAL"
          ? {
              profesionalId: c.identidad.profesionalId,
              sedeId: { in: c.identidad.sedeIds },
            }
          : {},
      ],
    },
    select: {
      total: true,
      pagos: { where: { estado: "APROBADO" }, select: { monto: true } },
      cobros: { where: { anuladoEn: null }, select: { monto: true } },
    },
  });
  return reservas
    .reduce(
      (s, r) =>
        s.plus(
          Prisma.Decimal.max(
            0,
            r.total.minus(
              [...r.pagos, ...r.cobros].reduce(
                (n, p) => n.plus(p.monto),
                new Prisma.Decimal(0),
              ),
            ),
          ),
        ),
      new Prisma.Decimal(0),
    )
    .toNumber();
}
