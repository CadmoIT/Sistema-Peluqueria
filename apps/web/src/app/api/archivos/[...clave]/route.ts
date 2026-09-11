/** Sirve públicamente imágenes de negocio almacenadas en R2 mediante claves no predecibles. */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { obtenerClienteR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(
  _solicitud: Request,
  { params }: { params: Promise<{ clave: string[] }> },
) {
  const r2 = obtenerClienteR2();
  const clave = (await params).clave.join("/");
  if (!r2 || !clave || clave.includes("..")) {
    return new Response("Archivo no encontrado.", { status: 404 });
  }
  try {
    const archivo = await r2.cliente.send(
      new GetObjectCommand({ Bucket: r2.bucket, Key: clave }),
    );
    if (!archivo.Body)
      return new Response("Archivo no encontrado.", { status: 404 });
    return new Response(archivo.Body.transformToWebStream(), {
      headers: {
        "Content-Type": archivo.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Archivo no encontrado.", { status: 404 });
  }
}
