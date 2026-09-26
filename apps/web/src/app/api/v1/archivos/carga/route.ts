/** Emite firmas de carga directa para imágenes autenticadas en Cloudinary. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { crearFirmaCloudinary } from "@/lib/cloudinary-firma";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
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
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  }
  if (superaLimiteDeclarado(solicitud, 32 * 1024)) {
    return NextResponse.json({ mensaje: "Solicitud demasiado grande." }, { status: 413 });
  }

  const cuerpo = (await solicitud.json().catch(() => null)) as {
    tipo?: unknown;
    tipoContenido?: unknown;
    bytes?: unknown;
  } | null;
  if (
    !cuerpo ||
    typeof cuerpo.tipoContenido !== "string" ||
    !formatosPermitidos.has(cuerpo.tipoContenido) ||
    typeof cuerpo.bytes !== "number" ||
    !Number.isInteger(cuerpo.bytes) ||
    cuerpo.bytes <= 0 ||
    cuerpo.bytes > maximoBytes
  ) {
    return NextResponse.json(
      { mensaje: "Usá una imagen JPG, PNG, WebP o AVIF de hasta 8 MB." },
      { status: 400 },
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    return NextResponse.json(
      { mensaje: "El almacenamiento de imágenes todavía no está configurado." },
      { status: 503 },
    );
  }

  const tipo =
    typeof cuerpo.tipo === "string"
      ? cuerpo.tipo.replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "general"
      : "general";
  const parametros = {
    folder: `turnos-rapidos/${contexto.negocio.id}/${tipo}`,
    overwrite: "false",
    public_id: randomUUID(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: "c_limit,w_2400,h_1800,f_webp,q_auto:good",
    upload_preset: uploadPreset,
  };
  const firma = crearFirmaCloudinary(parametros, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    firma,
    ...parametros,
  });
}
