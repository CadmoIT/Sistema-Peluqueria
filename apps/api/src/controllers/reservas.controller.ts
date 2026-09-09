/** Traduce solicitudes HTTP en operaciones del servicio de reservas. */
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CrearReservaDto } from "../dto/reservas/crear-reserva.dto";
import { RUTAS_API } from "../routes/api.routes";
import { ReservasService } from "../services/reservas.service";

@ApiTags("reservas")
@Controller(RUTAS_API.reservasPublicas)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  crear(@Body() datos: CrearReservaDto) {
    return this.reservasService.crear(datos);
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.reservasService.obtener(id);
  }

  @Post(":id/confirmar")
  confirmar(@Param("id") id: string) {
    return this.reservasService.confirmar(id);
  }
}
