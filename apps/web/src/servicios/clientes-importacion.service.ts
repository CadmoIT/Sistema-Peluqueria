/** Revisa contactos del negocio autenticado antes de guardar una importación. */
import "server-only";
import { Prisma } from "@prisma/client";
import { validarFilas } from "@/lib/clientes-archivo";
import {
  planificarImportacion,
  type ClienteImportable,
} from "@/lib/clientes-importacion";
export class ErrorSolicitudImportacion extends Error {}
export async function revisarImportacion(
  db: Pick<Prisma.TransactionClient, "$queryRaw">,
  negocioId: string,
  filas: unknown[],
  completar: boolean,
) {
  const validas = validarFilas(filas).filas;
  const correos = validas.flatMap((f) => (f.email ? [f.email] : []));
  const telefonos = validas.flatMap((f) => (f.telefono ? [f.telefono] : []));
  const existentes =
    correos.length || telefonos.length
      ? await db.$queryRaw<ClienteImportable[]>(Prisma.sql`
          SELECT "id", "nombre", "apellido", "email", "telefono"
          FROM "Cliente"
          WHERE "negocioId" = ${negocioId} AND (
            ${correos.length ? Prisma.sql`LOWER(TRIM("email")) IN (${Prisma.join(correos)})` : Prisma.sql`FALSE`}
            OR ${telefonos.length ? Prisma.sql`regexp_replace("telefono", '[^+0-9]', '', 'g') IN (${Prisma.join(telefonos)})` : Prisma.sql`FALSE`}
          )
        `)
      : [];
  return planificarImportacion(filas, existentes, completar);
}
export function leerSolicitudImportacion(entrada: unknown) {
  const datos =
    entrada && typeof entrada === "object"
      ? (entrada as Record<string, unknown>)
      : {};
  if (!Array.isArray(datos.filas) || !datos.filas.length)
    throw new ErrorSolicitudImportacion("No hay filas para importar.");
  if (datos.filas.length > 1000)
    throw new ErrorSolicitudImportacion(
      "Se permiten hasta 1.000 filas por importación.",
    );
  return {
    filas: datos.filas as unknown[],
    completar: datos.completarExistentes === true,
  };
}
