/** Implementa negocios en memoria para demos y pruebas antes de conectar Prisma. */
import { Injectable } from "@nestjs/common";
import type { NegocioPublico } from "@turnos/contratos";
import { crearNegocioDemostracion } from "../../factories/negocio-demo.factory";
import type { NegociosRepository } from "../contracts/negocios.repository";

@Injectable()
export class NegociosMemoriaRepository implements NegociosRepository {
  private readonly negocio = crearNegocioDemostracion();

  async buscarPorSlug(slug: string): Promise<NegocioPublico | null> {
    const aliasValidos = [this.negocio.slug, "manlybarbercompany"];
    return aliasValidos.includes(slug) ? this.negocio : null;
  }
}
