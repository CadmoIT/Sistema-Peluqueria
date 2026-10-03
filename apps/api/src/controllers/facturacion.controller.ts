/** Expone por HTTP los planes y el inicio de una suscripción. */
import { Controller, Get, Post, GoneException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RUTAS_API } from "../routes/api.routes";
import { FacturacionService } from "../services/facturacion.service";

@ApiTags("facturación")
@Controller(RUTAS_API.facturacion)
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Get("planes")
  obtenerPlanes() {
    return this.facturacionService.obtenerCatalogo();
  }

  @Post("suscripciones")
  contratar() {
    throw new GoneException(
      "La contratación se realiza desde el panel autenticado del dueño.",
    );
  }
}
