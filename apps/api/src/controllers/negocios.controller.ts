/** Recibe consultas HTTP del catálogo público de cada negocio. */
import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RUTAS_API } from "../routes/api.routes";
import { NegociosService } from "../services/negocios.service";

@ApiTags("público")
@Controller(RUTAS_API.negociosPublicos)
export class NegociosController {
  constructor(private readonly negociosService: NegociosService) {}

  @Get(":slug")
  obtenerPorSlug(@Param("slug") slug: string) {
    return this.negociosService.obtenerPublico(slug);
  }
}
