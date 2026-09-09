/** Contiene reglas de validación de reservas que no dependen del transporte HTTP. */
import { BadRequestException } from "@nestjs/common";
import type { DatosReserva } from "../domain/entities/reserva.entity";

export function validarServiciosSeleccionados(datos: DatosReserva) {
  if (datos.servicioIds.length === 0) {
    throw new BadRequestException("Seleccioná al menos un servicio");
  }
}
