/** Construye y valida de manera segura la firma HMAC enviada por Mercado Pago. */
import { createHmac, timingSafeEqual } from "node:crypto";

export function validarFirmaMercadoPago({
  dataId,
  requestId,
  encabezadoFirma,
  secreto,
}: {
  dataId: string;
  requestId: string | null;
  encabezadoFirma: string | null;
  secreto: string;
}) {
  const partes = Object.fromEntries(
    (encabezadoFirma ?? "")
      .split(",")
      .map((parte) => parte.trim().split("=", 2))
      .filter((parte) => parte.length === 2),
  );
  const ts = partes.ts;
  const firmaRecibida = partes.v1;
  if (!dataId || !requestId || !ts || !firmaRecibida) return false;

  const manifiesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const firmaEsperada = createHmac("sha256", secreto)
    .update(manifiesto)
    .digest("hex");
  const esperada = Buffer.from(firmaEsperada, "utf8");
  const recibida = Buffer.from(firmaRecibida, "utf8");
  return (
    esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
  );
}
