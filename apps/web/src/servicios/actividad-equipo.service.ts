/** Guarda autoría y versión de cambios en la misma transacción que la operación. */
import { type Prisma } from "@prisma/client";
import type { ContextoEquipo } from "./contexto-equipo.service";
export async function registrarActividadEquipo(
  tx: Prisma.TransactionClient,
  c: ContextoEquipo,
  entrada: {
    accion: string;
    recurso: string;
    recursoId?: string;
    sedeId?: string;
    profesionalId?: string | null;
    compartida?: boolean;
    detalle?: Prisma.InputJsonValue;
  },
) {
  await tx.auditoria.create({
    data: {
      negocioId: c.negocio.id,
      usuarioId: c.usuario.id,
      actorNombre: c.usuario.name,
      accion: entrada.accion,
      recurso: entrada.recurso,
      recursoId: entrada.recursoId,
      sedeId: entrada.sedeId,
      profesionalId: entrada.profesionalId ?? null,
      visibilidad: entrada.compartida ? "COMPARTIDA" : "PERSONAL",
      detalle: entrada.detalle,
    },
  });
  await tx.negocio.update({
    where: { id: c.negocio.id },
    data: { versionEquipo: { increment: 1 } },
  });
}
