/** Procesa las retenciones de horarios que alcanzaron su vencimiento. */
import type { Job } from "pg-boss";
import { prisma } from "../lib/prisma.js";

export const COLA_VENCER_RETENCION = "vencer-retencion";

export async function procesarRetencionesVencidas(trabajos: Job[]) {
  if (!trabajos.length) return;
  const resultado = await prisma.reserva.updateMany({
    where: {
      estado: "RETENIDA",
      retenidaHasta: { lte: new Date() },
    },
    data: { estado: "VENCIDA", retenidaHasta: null },
  });
  if (resultado.count) {
    console.log(`${resultado.count} retenciones vencidas y liberadas.`);
  }
  const suscripciones = await prisma.suscripcion.updateMany({
    where: { estado: "EN_GRACIA", graciaHasta: { lte: new Date() } },
    data: { estado: "PAUSADA" },
  });
  if (suscripciones.count) {
    console.log(
      `${suscripciones.count} suscripciones pausadas al terminar la gracia.`,
    );
  }
}
