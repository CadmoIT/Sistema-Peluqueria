/** Actualiza únicamente el rubro y preserva de forma atómica las demás claves de configuración. */
import "server-only";
import { prisma } from "@/lib/prisma";
import { cambiosTipoNegocio, type TipoNegocio } from "@/lib/perfiles-negocio";

export async function guardarRubroNegocio(
  negocioId: string,
  tipoNegocio: TipoNegocio,
) {
  const cambios = JSON.stringify(cambiosTipoNegocio(tipoNegocio));
  await prisma.$executeRaw`
    UPDATE "Negocio"
    SET "configuracion" = (
      CASE WHEN jsonb_typeof("configuracion") = 'object'
        THEN "configuracion" ELSE '{}'::jsonb END
    ) || ${cambios}::jsonb, "actualizadoEn" = NOW()
    WHERE "id" = ${negocioId}
  `;
}
