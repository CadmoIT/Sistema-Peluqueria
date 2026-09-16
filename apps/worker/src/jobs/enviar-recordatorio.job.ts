/** Recorre los avisos de turnos cada minuto mediante la cola existente. */
import type { Job } from "pg-boss";
import { programarAvisos } from "./avisos-programacion.js";
import { entregarAvisos } from "./avisos-entrega.js";

export const COLA_ENVIAR_RECORDATORIO = "enviar-recordatorio";

export async function procesarRecordatorios(_trabajos: Job[]) {
  await programarAvisos();
  await entregarAvisos();
}
