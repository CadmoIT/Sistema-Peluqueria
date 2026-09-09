/** Recibe callbacks de proveedores y los entrega al servicio de integraciones. */
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RUTAS_API } from "../routes/api.routes";
import { IntegracionesService } from "../services/integraciones.service";

@ApiTags("integraciones")
@Controller(RUTAS_API.webhooks)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Post("mercadopago")
  @HttpCode(200)
  recibirMercadoPago(
    @Body() contenido: Record<string, unknown>,
    @Headers("x-signature") firma?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.integracionesService.recibirMercadoPago(
      contenido,
      firma,
      requestId,
    );
  }

  @Post("meta")
  @HttpCode(200)
  recibirMeta(
    @Body() contenido: Record<string, unknown>,
    @Headers("x-hub-signature-256") firma?: string,
  ) {
    return this.integracionesService.recibirMeta(contenido, firma);
  }
}
