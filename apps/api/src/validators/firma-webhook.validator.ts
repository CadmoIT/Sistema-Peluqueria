/** Valida firmas HMAC sin exponer diferencias de tiempo entre valores. */
import { createHmac, timingSafeEqual } from "node:crypto";

export function coincideFirmaHmac(
  contenido: string,
  firma: string | undefined,
  secreto: string | undefined,
) {
  if (!secreto) {
    return process.env.NODE_ENV !== "production";
  }

  if (!firma) {
    return false;
  }

  const firmaEsperada = createHmac("sha256", secreto)
    .update(contenido)
    .digest("hex");
  const firmaRecibida = firma.replace(/^sha256=/, "");
  const esperado = Buffer.from(firmaEsperada);
  const recibido = Buffer.from(firmaRecibida);

  return (
    esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
  );
}
