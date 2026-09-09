/** Resuelve consultas de negocios y traduce ausencias a errores de aplicación. */
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  NEGOCIOS_REPOSITORY,
  type NegociosRepository,
} from "../repositories/contracts/negocios.repository";

@Injectable()
export class NegociosService {
  constructor(
    @Inject(NEGOCIOS_REPOSITORY)
    private readonly repositorio: NegociosRepository,
  ) {}

  async obtenerPublico(slug: string) {
    const negocio = await this.repositorio.buscarPorSlug(slug);

    if (!negocio) {
      throw new NotFoundException("Negocio no encontrado");
    }

    return negocio;
  }
}
