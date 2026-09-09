/** Define las operaciones de persistencia requeridas por el servicio de reservas. */
import type { Reserva } from "../../domain/entities/reserva.entity";

export const RESERVAS_REPOSITORY = Symbol("RESERVAS_REPOSITORY");

export interface ReservasRepository {
  guardar(reserva: Reserva): Promise<void>;
  buscarPorId(id: string): Promise<Reserva | null>;
  existeHorario(claveHorario: string): Promise<boolean>;
  listarRetenidas(): Promise<Reserva[]>;
  eliminar(id: string): Promise<void>;
}
