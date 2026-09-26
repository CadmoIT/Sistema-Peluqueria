/** Solicita una firma autenticada y envía la imagen directamente a Cloudinary. */
const formatosPermitidos = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const maximoBytes = 8 * 1024 * 1024;

type FirmaCarga = {
  cloudName: string;
  apiKey: string;
  firma: string;
  folder: string;
  overwrite: string;
  public_id: string;
  timestamp: string;
  transformation: string;
  upload_preset: string;
};

export async function subirImagenCloudinary(archivo: File, tipo: string) {
  if (
    !formatosPermitidos.has(archivo.type) ||
    archivo.size <= 0 ||
    archivo.size > maximoBytes
  ) {
    throw new Error("Usá una imagen JPG, PNG, WebP o AVIF de hasta 8 MB.");
  }

  const respuestaFirma = await fetch("/api/v1/archivos/carga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo,
      tipoContenido: archivo.type,
      bytes: archivo.size,
    }),
  });
  const datosFirma = (await respuestaFirma.json().catch(() => null)) as
    | (FirmaCarga & { mensaje?: string })
    | null;
  if (!respuestaFirma.ok || !datosFirma?.firma) {
    throw new Error(datosFirma?.mensaje ?? "No se pudo iniciar la carga.");
  }

  const formulario = new FormData();
  formulario.set("file", archivo);
  formulario.set("api_key", datosFirma.apiKey);
  formulario.set("signature", datosFirma.firma);
  formulario.set("folder", datosFirma.folder);
  formulario.set("overwrite", datosFirma.overwrite);
  formulario.set("public_id", datosFirma.public_id);
  formulario.set("timestamp", datosFirma.timestamp);
  formulario.set("transformation", datosFirma.transformation);
  formulario.set("upload_preset", datosFirma.upload_preset);

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(datosFirma.cloudName)}/image/upload`,
    { method: "POST", body: formulario },
  );
  const resultado = (await respuesta.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;
  const url = resultado?.secure_url;
  if (!respuesta.ok || !url) {
    throw new Error("Cloudinary no pudo guardar la imagen. Probá nuevamente.");
  }

  const segura = new URL(url);
  if (segura.protocol !== "https:" || segura.hostname !== "res.cloudinary.com") {
    throw new Error("Cloudinary devolvió una dirección de imagen no válida.");
  }
  return segura.toString();
}
