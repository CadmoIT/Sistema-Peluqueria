/** Procesa el envío diferido de un recordatorio de turno. */
import type { Job } from "pg-boss";

export const COLA_ENVIAR_RECORDATORIO = "enviar-recordatorio";

export async function procesarRecordatorios(trabajos: Job[]) {
  for (const trabajo of trabajos) {
    console.log("Recordatorio procesado", trabajo.id);
  }
}
