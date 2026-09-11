/** Centraliza el cliente compatible con S3 utilizado para guardar imágenes en Cloudflare R2. */
import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let cliente: S3Client | undefined;

export function obtenerConfiguracionR2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function obtenerClienteR2() {
  const configuracion = obtenerConfiguracionR2();
  if (!configuracion) return null;
  cliente ??= new S3Client({
    region: "auto",
    endpoint: `https://${configuracion.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: configuracion.accessKeyId,
      secretAccessKey: configuracion.secretAccessKey,
    },
  });
  return { cliente, bucket: configuracion.bucket };
}
