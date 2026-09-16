/** Actualiza datos operativos, sedes y la vinculación pública con Google. */
"use server";

import type { PoliticaContacto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { esTipoNegocio, puedeCambiarTipoNegocio } from "@/lib/perfiles-negocio";
import { guardarRubroNegocio } from "@/servicios/rubro-negocio.service";

export type ResultadoTipoNegocio = { ok: boolean; mensaje: string };

export async function actualizarTipoNegocio(
  _anterior: ResultadoTipoNegocio,
  datos: FormData,
): Promise<ResultadoTipoNegocio> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!puedeCambiarTipoNegocio(membresia.rol))
    return {
      ok: false,
      mensaje:
        "Sólo el dueño o un administrador puede cambiar el tipo de negocio.",
    };
  const tipoNegocio = leerTexto(datos, "tipoNegocio");
  if (!esTipoNegocio(tipoNegocio))
    return { ok: false, mensaje: "Elegí un tipo de negocio de la lista." };
  try {
    await guardarRubroNegocio(negocio.id, tipoNegocio);
  } catch {
    return {
      ok: false,
      mensaje: "No pudimos guardar el tipo de negocio. Intentá nuevamente.",
    };
  }
  revalidatePath("/panel", "layout");
  return {
    ok: true,
    mensaje: "El tipo de negocio quedó actualizado. Tus datos se conservaron.",
  };
}

const politicasContacto = new Set<PoliticaContacto>([
  "EMAIL",
  "TELEFONO",
  "CUALQUIERA",
  "NINGUNO",
]);

export async function actualizarConfiguracionNegocio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const politicaSolicitada = leerTexto(
    datos,
    "politicaContacto",
  ) as PoliticaContacto;
  const politicaContacto = politicasContacto.has(politicaSolicitada)
    ? politicaSolicitada
    : negocio.politicaContacto;

  await prisma.negocio.update({
    where: { id: negocio.id },
    data: {
      nombre: leerTexto(datos, "nombre") || negocio.nombre,
      telefono: textoOpcional(leerTexto(datos, "telefono")),
      email: textoOpcional(leerTexto(datos, "email")),
      politicaContacto,
    },
  });

  revalidatePath("/panel", "layout");
  redirect("/panel/configuracion?configuracion=guardada");
}

export async function actualizarSede(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");

  await prisma.sede.updateMany({
    where: { id, negocioId: negocio.id },
    data: {
      nombre: leerTexto(datos, "nombre"),
      direccion: leerTexto(datos, "direccion"),
      telefono: textoOpcional(leerTexto(datos, "telefono")),
      googlePlaceId: textoOpcional(leerTexto(datos, "googlePlaceId")),
      googleMapsUrl: textoOpcional(leerTexto(datos, "googleMapsUrl")),
    },
  });

  revalidatePath("/panel/configuracion");
  revalidatePath(`/sitio/${negocio.slug}`);
  redirect("/panel/configuracion?configuracion=local-guardado");
}

export async function actualizarPuntajeGoogle(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const sede = await prisma.sede.findFirst({
    where: { id, negocioId: negocio.id },
  });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!sede?.googlePlaceId || !apiKey) return;

  const respuesta = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(sede.googlePlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri",
      },
      cache: "no-store",
    },
  );

  if (!respuesta.ok) return;

  const lugar = (await respuesta.json()) as {
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
  };

  await prisma.sede.update({
    where: { id: sede.id },
    data: {
      googlePuntaje: lugar.rating,
      googleResenas: lugar.userRatingCount,
      googleMapsUrl: elegirEnlaceGoogle(
        lugar.googleMapsUri,
        sede.googleMapsUrl,
      ),
      googleActualizadoEn: new Date(),
    },
  });

  revalidatePath("/panel/configuracion");
  revalidatePath(`/sitio/${negocio.slug}`);
  redirect("/panel/configuracion?configuracion=google-actualizado");
}

const variablesAviso = new Set([
  "nombre",
  "negocio",
  "servicio",
  "fecha",
  "hora",
  "enlace",
]);

export async function guardarConfiguracionAvisos(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const campos = [
    "emailAsuntoConfirmacion",
    "emailTextoConfirmacion",
    "emailAsuntoRecordatorio",
    "emailTextoRecordatorio",
  ] as const;
  const textos = Object.fromEntries(
    campos.map((campo) => [campo, leerTexto(datos, campo)]),
  );
  const validos = campos.every((campo) => {
    const valor = textos[campo] ?? "";
    const maximo = campo.includes("Asunto") ? 140 : 1000;
    return (
      valor.length > 0 &&
      valor.length <= maximo &&
      Array.from(valor.matchAll(/\{([^}]+)\}/g)).every((grupo) =>
        variablesAviso.has(grupo[1] ?? ""),
      )
    );
  });
  if (!validos)
    redirect("/panel/configuracion?configuracion=avisos-error#avisos");

  await prisma.configuracionAvisos.upsert({
    where: { negocioId: negocio.id },
    create: {
      negocioId: negocio.id,
      emailConfirmacionActivo: datos.get("emailConfirmacionActivo") === "on",
      emailRecordatorioActivo: datos.get("emailRecordatorioActivo") === "on",
      whatsappConfirmacionActivo:
        datos.get("whatsappConfirmacionActivo") === "on",
      whatsappRecordatorioActivo:
        datos.get("whatsappRecordatorioActivo") === "on",
      emailAsuntoConfirmacion: textos.emailAsuntoConfirmacion!,
      emailTextoConfirmacion: textos.emailTextoConfirmacion!,
      emailAsuntoRecordatorio: textos.emailAsuntoRecordatorio!,
      emailTextoRecordatorio: textos.emailTextoRecordatorio!,
    },
    update: {
      emailConfirmacionActivo: datos.get("emailConfirmacionActivo") === "on",
      emailRecordatorioActivo: datos.get("emailRecordatorioActivo") === "on",
      whatsappConfirmacionActivo:
        datos.get("whatsappConfirmacionActivo") === "on",
      whatsappRecordatorioActivo:
        datos.get("whatsappRecordatorioActivo") === "on",
      emailAsuntoConfirmacion: textos.emailAsuntoConfirmacion!,
      emailTextoConfirmacion: textos.emailTextoConfirmacion!,
      emailAsuntoRecordatorio: textos.emailAsuntoRecordatorio!,
      emailTextoRecordatorio: textos.emailTextoRecordatorio!,
    },
  });
  revalidatePath("/panel/configuracion");
  redirect("/panel/configuracion?configuracion=avisos-guardados#avisos");
}

function elegirEnlaceGoogle(valor?: string, existente?: string | null) {
  const esUrlGoogle =
    valor?.startsWith("https://www.google.") ||
    valor?.startsWith("https://maps.google.");
  return esUrlGoogle ? valor : (existente ?? null);
}
