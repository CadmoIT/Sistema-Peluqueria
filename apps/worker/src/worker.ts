/** Configura la cola y registra cada trabajo de segundo plano. */
import PgBoss from "pg-boss";
import {
  COLA_ENVIAR_RECORDATORIO,
  procesarRecordatorios,
} from "./jobs/enviar-recordatorio.job.js";
import {
  COLA_VENCER_RETENCION,
  procesarRetencionesVencidas,
} from "./jobs/vencer-retencion.job.js";

export async function iniciarWorker(databaseUrl: string) {
  const cola = new PgBoss(databaseUrl);

  cola.on("error", (error) => {
    console.error("Error de cola", error);
  });

  await cola.start();
  await cola.createQueue(COLA_ENVIAR_RECORDATORIO);
  await cola.createQueue(COLA_VENCER_RETENCION);
  await cola.schedule(COLA_VENCER_RETENCION, "* * * * *", {}, { tz: "UTC" });
  await cola.send(COLA_VENCER_RETENCION, {});
  await cola.work(COLA_ENVIAR_RECORDATORIO, procesarRecordatorios);
  await cola.work(COLA_VENCER_RETENCION, procesarRetencionesVencidas);

  console.log("Worker TurnosRápidos activo.");
}
