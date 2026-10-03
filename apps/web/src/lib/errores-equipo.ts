/** No devuelve consultas, identificadores internos ni datos de Prisma al navegador. */
import { Prisma } from "@prisma/client";
export function mensajeErrorEquipo(
  error: unknown,
  alternativa = "No pudimos guardar la operación. Revisá los datos e intentá nuevamente.",
) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  )
    return alternativa;
  return error instanceof Error ? error.message : alternativa;
}
