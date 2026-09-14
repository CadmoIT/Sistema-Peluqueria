/** Actualiza datos operativos, sedes y la vinculación pública con Google. */
"use server";

import type { PoliticaContacto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

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

function elegirEnlaceGoogle(valor?: string, existente?: string | null) {
  const esUrlGoogle =
    valor?.startsWith("https://www.google.") ||
    valor?.startsWith("https://maps.google.");
  return esUrlGoogle ? valor : (existente ?? null);
}
