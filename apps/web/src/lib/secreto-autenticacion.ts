/** Exige una clave privada fuerte en producción y reserva una clave sólo para desarrollo local. */
const SECRETO_SOLO_DESARROLLO =
  "solo-desarrollo-turnos-rapidos-cambiar-antes-de-publicar";
const LARGO_MINIMO_SECRETO = 32;

export function obtenerSecretoAutenticacion(
  entorno: NodeJS.ProcessEnv = process.env,
) {
  const secreto = entorno.BETTER_AUTH_SECRET;
  if (
    entorno.NODE_ENV === "production" &&
    (!secreto || secreto.length < LARGO_MINIMO_SECRETO)
  ) {
    throw new Error(
      "En producción, BETTER_AUTH_SECRET debe tener al menos 32 caracteres.",
    );
  }

  return secreto || SECRETO_SOLO_DESARROLLO;
}
