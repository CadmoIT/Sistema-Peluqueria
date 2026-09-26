/** Firma parámetros de carga de Cloudinary sin exponer el secreto al navegador. */
import { createHash } from "node:crypto";

export function crearFirmaCloudinary(
  parametros: Record<string, string>,
  secreto: string,
) {
  const cadena = Object.entries(parametros)
    .filter(([, valor]) => valor !== "" && valor !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([clave, valor]) => `${clave}=${valor}`)
    .join("&");
  return createHash("sha1").update(cadena + secreto).digest("hex");
}
