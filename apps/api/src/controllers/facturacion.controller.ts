/** Expone por HTTP los planes y el inicio de una suscripción. */
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContratarPlanDto } from "../dto/facturacion/contratar-plan.dto";
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
  contratar(@Body() datos: ContratarPlanDto) {
    return this.facturacionService.contratar(datos);
  }
}
