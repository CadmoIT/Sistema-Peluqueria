/** Implementa reservas en memoria para desarrollar sin depender de PostgreSQL. */
import { Injectable } from "@nestjs/common";
import type { Reserva } from "../../domain/entities/reserva.entity";
import type { ReservasRepository } from "../contracts/reservas.repository";

@Injectable()
export class ReservasMemoriaRepository implements ReservasRepository {
  private readonly reservas = new Map<string, Reserva>();

  async guardar(reserva: Reserva) {
    this.reservas.set(reserva.id, reserva);
  }

  async buscarPorId(id: string) {
    return this.reservas.get(id) ?? null;
  }

  async existeHorario(claveHorario: string) {
    return [...this.reservas.values()].some(
      (reserva) => reserva.claveHorario === claveHorario,
    );
  }

  async listarRetenidas() {
    return [...this.reservas.values()].filter(
      (reserva) => reserva.estado === "RETENIDA",
    );
  }

  async eliminar(id: string) {
    this.reservas.delete(id);
  }
}
