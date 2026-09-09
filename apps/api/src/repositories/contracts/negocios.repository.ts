/** Define qué necesita la aplicación para consultar negocios, sin fijar una base de datos. */
import type { NegocioPublico } from "@turnos/contratos";

export const NEGOCIOS_REPOSITORY = Symbol("NEGOCIOS_REPOSITORY");

export interface NegociosRepository {
  buscarPorSlug(slug: string): Promise<NegocioPublico | null>;
}
