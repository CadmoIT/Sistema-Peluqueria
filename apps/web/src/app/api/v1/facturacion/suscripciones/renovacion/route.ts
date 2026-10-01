/** Cambia la renovación del negocio autenticado mediante Mercado Pago. */
import { ejecutarRenovacionMercadoPago } from "@/servicios/renovacion-mercadopago";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

export async function POST(solicitud: Request) {
  return ejecutarRenovacionMercadoPago(solicitud, obtenerContextoApi);
}
