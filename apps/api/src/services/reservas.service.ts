/** Coordina retenciones de turnos y evita que dos clientes ocupen el mismo horario. */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RETENCION_TURNO_MINUTOS } from "@turnos/config";
import { Reserva } from "../domain/entities/reserva.entity";
import type { CrearReservaDto } from "../dto/reservas/crear-reserva.dto";
import {
  RESERVAS_REPOSITORY,
  type ReservasRepository,
} from "../repositories/contracts/reservas.repository";
import { validarServiciosSeleccionados } from "../validators/reserva.validator";

@Injectable()
export class ReservasService {
  constructor(
    @Inject(RESERVAS_REPOSITORY)
    private readonly repositorio: ReservasRepository,
  ) {}

  async crear(datos: CrearReservaDto) {
    validarServiciosSeleccionados(datos);
    await this.eliminarRetencionesVencidas();

    const claveHorario = this.crearClaveHorario(datos);
    if (await this.repositorio.existeHorario(claveHorario)) {
      throw new ConflictException("El horario acaba de ocuparse");
    }

    const id = randomUUID();
    const reserva = Reserva.retenida({
      id,
      codigo: id.slice(0, 8).toUpperCase(),
      claveHorario,
      venceEn: this.calcularVencimiento(),
      datos,
    });

    await this.repositorio.guardar(reserva);
    return reserva;
  }

  async obtener(id: string) {
    const reserva = await this.repositorio.buscarPorId(id);

    if (!reserva || reserva.estaVencida()) {
      throw new BadRequestException("Reserva inexistente o vencida");
    }

    return reserva;
  }

  async confirmar(id: string) {
    const reserva = await this.obtener(id);
    reserva.confirmar();
    await this.repositorio.guardar(reserva);
    return reserva;
  }

  private crearClaveHorario(datos: CrearReservaDto) {
    return [
      datos.negocioSlug,
      datos.sedeId,
      datos.profesionalId,
      datos.inicio,
    ].join(":");
  }

  private calcularVencimiento() {
    const milisegundos = RETENCION_TURNO_MINUTOS * 60_000;
    return new Date(Date.now() + milisegundos).toISOString();
  }

  private async eliminarRetencionesVencidas() {
    const retenciones = await this.repositorio.listarRetenidas();

    for (const reserva of retenciones) {
      if (reserva.estaVencida()) {
        await this.repositorio.eliminar(reserva.id);
      }
    }
  }
}
