/** Rechaza cuerpos declarados por encima del límite antes de leerlos en memoria. */
export function superaLimiteDeclarado(
  solicitud: Pick<Request, "headers">,
  maximoBytes: number,
) {
  const contenido = solicitud.headers.get("content-length");
  if (contenido === null) return false;

  const largo = Number(contenido);
  return !Number.isSafeInteger(largo) || largo < 0 || largo > maximoBytes;
}
