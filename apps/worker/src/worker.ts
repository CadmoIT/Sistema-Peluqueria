/** Configura la cola y registra cada trabajo de segundo plano. */
import PgBoss from "pg-boss";
import {
  COLA_SINCRONIZAR_GOOGLE,
  sincronizarGoogleCalendar,
} from "./jobs/sincronizar-google.job.js";
import {
  COLA_ENVIAR_RECORDATORIO,
  procesarRecordatorios,
} from "./jobs/enviar-recordatorio.job.js";
import {
  COLA_ENVIAR_CORREOS,
  procesarCorreosPendientes,
} from "./jobs/enviar-correos.job.js";
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
  await cola.createQueue(COLA_SINCRONIZAR_GOOGLE);
  await cola.schedule(
    COLA_SINCRONIZAR_GOOGLE,
    "*/5 * * * *",
    {},
    { tz: "UTC" },
  );
  await cola.send(COLA_SINCRONIZAR_GOOGLE, {});
  await cola.work(COLA_SINCRONIZAR_GOOGLE, sincronizarGoogleCalendar);
  await cola.createQueue(COLA_ENVIAR_RECORDATORIO);
  await cola.createQueue(COLA_ENVIAR_CORREOS);
  await cola.createQueue(COLA_VENCER_RETENCION);
  await cola.schedule(COLA_ENVIAR_RECORDATORIO, "* * * * *", {}, { tz: "UTC" });
  await cola.schedule(COLA_ENVIAR_CORREOS, "* * * * *", {}, { tz: "UTC" });
  await cola.send(COLA_ENVIAR_RECORDATORIO, {});
  await cola.send(COLA_ENVIAR_CORREOS, {});
  await cola.schedule(COLA_VENCER_RETENCION, "* * * * *", {}, { tz: "UTC" });
  await cola.send(COLA_VENCER_RETENCION, {});
  await cola.work(COLA_ENVIAR_RECORDATORIO, procesarRecordatorios);
  await cola.work(COLA_ENVIAR_CORREOS, procesarCorreosPendientes);
  await cola.work(COLA_VENCER_RETENCION, procesarRetencionesVencidas);

  console.log("Worker TurnosRápidos activo.");
}
