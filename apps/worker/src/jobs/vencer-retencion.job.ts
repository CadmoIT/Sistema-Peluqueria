/** Procesa las retenciones de horarios que alcanzaron su vencimiento. */
import type { Job } from "pg-boss";

export const COLA_VENCER_RETENCION = "vencer-retencion";

export async function procesarRetencionesVencidas(trabajos: Job[]) {
  for (const trabajo of trabajos) {
    console.log("Retención vencida", trabajo.id);
  }
}
