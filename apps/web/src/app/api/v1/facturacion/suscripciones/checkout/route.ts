import { ejecutarCheckoutMercadoPago } from "@/servicios/checkout-mercadopago";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

export async function POST(solicitud: Request) {
  return ejecutarCheckoutMercadoPago(solicitud, obtenerContextoApi);
}
