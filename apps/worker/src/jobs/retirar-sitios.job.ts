/** Retiro reversible independiente de las credenciales de Mercado Pago. */
import { DIA_MS, DIAS_RETIRO_SITIO_TRAS_PRUEBA } from "@turnos/config";
import { prisma } from "../lib/prisma.js";

export const COLA_RETIRAR_SITIOS = "retirar-sitios-sin-plan";

export async function retirarSitiosSinPlan() {
  const ahora = new Date();
  // UPDATE atómico e idempotente. La configuración, slug y datos no se eliminan.
  await prisma.negocio.updateMany({
    where: {
      sitioRetiradoEn: null,
      suscripcion: { is: {
        estado: { in: ["CONFIGURACION_GRATUITA", "PAUSADA", "CANCELADA"] },
        primerPagoEn: null,
        pruebaFinalizaEn: { lte: new Date(ahora.getTime() - DIAS_RETIRO_SITIO_TRAS_PRUEBA * DIA_MS) },
        pagos: { none: { OR: [
          { pagadoEn: { not: null } },
          { estado: { in: ["APROBADO", "REEMBOLSADO", "REEMBOLSADO_PARCIAL", "CONTRACARGO"] } },
        ] } },
      } },
    },
    data: { publicado: false, sitioRetiradoEn: ahora },
  });
}
