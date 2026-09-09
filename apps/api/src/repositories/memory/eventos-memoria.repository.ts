/** Guarda identificadores de webhooks en memoria durante desarrollo y pruebas. */
import { Injectable } from "@nestjs/common";
import type { EventosRepository } from "../contracts/eventos.repository";

@Injectable()
export class EventosMemoriaRepository implements EventosRepository {
  private readonly claves = new Set<string>();

  async yaFueRecibido(clave: string) {
    return this.claves.has(clave);
  }

  async guardar(clave: string) {
    this.claves.add(clave);
  }
}
