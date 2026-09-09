/** Publica un endpoint mínimo para comprobar si la API responde. */
import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RUTAS_API } from "../routes/api.routes";
import { SaludService } from "../services/salud.service";

@ApiTags("salud")
@Controller(RUTAS_API.salud)
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @Get()
  obtenerEstado() {
    return this.saludService.obtenerEstado();
  }
}
