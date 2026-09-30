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
import { procesarCorreosPendientes } from "./jobs/enviar-correos.job.js";
import {
  COLA_VENCER_RETENCION,
  procesarRetencionesVencidas,
} from "./jobs/vencer-retencion.job.js";
import {
  COLA_MERCADOPAGO,
  procesarEventosMercadoPago,
} from "./jobs/procesar-mercadopago.job.js";

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
  await cola.createQueue(COLA_VENCER_RETENCION);
  await cola.createQueue(COLA_MERCADOPAGO);
  await cola.schedule(COLA_ENVIAR_RECORDATORIO, "* * * * *", {}, { tz: "UTC" });
  await cola.send(COLA_ENVIAR_RECORDATORIO, {});
  await cola.schedule(COLA_VENCER_RETENCION, "* * * * *", {}, { tz: "UTC" });
  // Sustituye el cron anterior; la bandeja PostgreSQL sigue siendo durable.
  await cola.unschedule(COLA_MERCADOPAGO);
  await cola.send(COLA_VENCER_RETENCION, {});
  await cola.work(COLA_ENVIAR_RECORDATORIO, procesarRecordatorios);
  await cola.work(COLA_VENCER_RETENCION, procesarRetencionesVencidas);
  let sondeoPagosEnCurso = false;
  const sondearPagos = async () => {
    if (sondeoPagosEnCurso) return;
    sondeoPagosEnCurso = true;
    try {
      await procesarEventosMercadoPago([]);
    } catch (error) {
      console.error("Falló el sondeo de la bandeja de Mercado Pago.", error);
    } finally {
      sondeoPagosEnCurso = false;
    }
  };
  // Atiende también los trabajos encolados antes de retirar el cron.
  await cola.work(COLA_MERCADOPAGO, sondearPagos);
  await sondearPagos();
  const intervaloPagos = setInterval(() => void sondearPagos(), 5_000);
  intervaloPagos.unref();

  let sondeoCorreosEnCurso = false;
  const sondearCorreos = async () => {
    if (sondeoCorreosEnCurso) return;
    sondeoCorreosEnCurso = true;
    try {
      await procesarCorreosPendientes([]);
    } catch (error) {
      console.error("Falló el sondeo de la bandeja de correos.", error);
    } finally {
      sondeoCorreosEnCurso = false;
    }
  };
  await sondearCorreos();
  const intervaloCorreos = setInterval(() => void sondearCorreos(), 5_000);
  intervaloCorreos.unref();

  console.log("Worker TurnosRápidos activo.");
}
