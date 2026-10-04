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
  const empleado = c.identidad.rol === "PROFESIONAL";
  if (empleado && (!c.identidad.profesionalId || !c.identidad.sedeIds.length))
    return 0;
  const resultado = await db.$queryRaw<
    Array<{ saldo: Prisma.Decimal }>
  >(Prisma.sql`
    SELECT COALESCE(SUM(GREATEST(0,
      COALESCE((SELECT "totalAcordado" FROM "CobroReserva" WHERE "reservaId"=r."id" AND "anuladoEn" IS NULL ORDER BY "creadoEn" ASC LIMIT 1),r."total")
      - COALESCE((SELECT SUM("monto") FROM "Pago" WHERE "reservaId"=r."id" AND "estado"='APROBADO'),0)
      - COALESCE((SELECT SUM("monto") FROM "CobroReserva" WHERE "reservaId"=r."id" AND "anuladoEn" IS NULL),0)
    )),0) AS saldo FROM "Reserva" r WHERE r."negocioId"=${c.negocio.id}
    AND r."estado" IN ('CONFIRMADA','COMPLETADA','AUSENTE')
    ${sedeId ? Prisma.sql`AND r."sedeId"=${sedeId}` : Prisma.empty}
    ${empleado ? Prisma.sql`AND r."profesionalId"=${c.identidad.profesionalId} AND r."sedeId" IN (${Prisma.join(c.identidad.sedeIds)})` : Prisma.empty}
  `);
  return Number(resultado[0]?.saldo ?? 0);
}
