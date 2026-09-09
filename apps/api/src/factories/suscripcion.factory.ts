/** Construye la respuesta inicial de una suscripción todavía no conectada a Mercado Pago. */
import { randomUUID } from "node:crypto";

type PlanContratado = {
  id: string;
  nombre: string;
  precioMensual: number;
  descripcion: string;
  destacado: boolean;
  beneficios: readonly string[];
};

export function crearSuscripcionPendiente(
  negocioId: string,
  plan: PlanContratado,
) {
  return {
    referencia: `sus_${randomUUID()}`,
    negocioId,
    plan,
    estado: "PENDIENTE" as const,
    initPoint: null,
    mensaje: "Configurá Mercado Pago para obtener el enlace de pago real.",
  };
}
