/** Valida, optimiza y guarda en R2 una imagen perteneciente al negocio autenticado. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { obtenerClienteR2 } from "@/lib/r2";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

export const runtime = "nodejs";

const formatosPermitidos = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const maximoBytes = 8 * 1024 * 1024;

export async function POST(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  }
  const formulario = await solicitud.formData().catch(() => null);
  const archivo = formulario?.get("archivo");
  const tipoEntrada = String(formulario?.get("tipo") ?? "general");
  if (
    !(archivo instanceof File) ||
    !formatosPermitidos.has(archivo.type) ||
    !archivo.size ||
    archivo.size > maximoBytes
  ) {
    return NextResponse.json(
      { mensaje: "Usá una imagen JPG, PNG, WebP o AVIF de hasta 8 MB." },
      { status: 400 },
    );
  }
  const r2 = obtenerClienteR2();
  if (!r2) {
    return NextResponse.json(
      { mensaje: "El almacenamiento de imágenes todavía no está configurado." },
      { status: 503 },
    );
  }

  let optimizada: Buffer;
  try {
    optimizada = await sharp(Buffer.from(await archivo.arrayBuffer()), {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: 2400,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { mensaje: "El archivo no contiene una imagen válida." },
      { status: 400 },
    );
  }

  const tipo = tipoEntrada.replace(/[^a-z0-9-]/gi, "").slice(0, 30);
  const clave = `${contexto.negocio.id}/${tipo || "general"}/${randomUUID()}.webp`;
  await r2.cliente.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: clave,
      Body: optimizada,
      ContentType: "image/webp",
      ContentLength: optimizada.byteLength,
      Metadata: { negocio: contexto.negocio.id },
    }),
  );

  const ruta = clave.split("/").map(encodeURIComponent).join("/");
  return NextResponse.json({ urlArchivo: `/api/archivos/${ruta}` });
}
