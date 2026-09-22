/** Guarda el borrador visual y publica una versión atómica del micrositio. */
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function guardarBorradorSitio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const sedeId = leerTexto(datos, "localId");
  const sede = await prisma.sede.findFirst({
    where: { id: sedeId, negocioId: negocio.id, activa: true },
    select: { id: true },
  });
  if (!sede) redirect("/panel/mi-sitio?configuracion=local-invalido");
  const anterior = await prisma.configuracionSitio.findUnique({
    where: { negocioId: negocio.id },
  });
  const base = (anterior?.borrador ?? {}) as Record<string, unknown>;
  const borradoresPorLocal = esMapa(base.locales) ? base.locales : {};
  const baseSinLocales = Object.fromEntries(
    Object.entries(base).filter(([clave]) => clave !== "locales"),
  );
  const seccionesPermitidas = ["servicios", "equipo", "ubicacion"];
  const secciones = datos
    .getAll("secciones")
    .map(String)
    .filter((seccion) => seccionesPermitidas.includes(seccion));
  const destacadosSolicitados = datos
    .getAll("serviciosDestacados")
    .map(String)
    .filter(Boolean);
  const destacadosValidos = await prisma.servicio.findMany({
    where: {
      negocioId: negocio.id,
      activo: true,
      id: { in: destacadosSolicitados },
    },
    select: { id: true },
  });
  const hero = [0, 1, 2]
    .map((indice) => ({
      url: leerTexto(datos, `hero${indice + 1}`),
      alt: leerTexto(datos, `heroAlt${indice + 1}`),
      focoX: limitarPorcentaje(leerTexto(datos, `heroFocoX${indice + 1}`), 50),
      focoY: limitarPorcentaje(leerTexto(datos, `heroFocoY${indice + 1}`), 50),
    }))
    .filter((imagen) => imagen.url);
  const borradorLocal = {
    ...baseSinLocales,
    titulo: leerTexto(datos, "titulo") || negocio.nombre,
    descripcion: leerTexto(datos, "descripcion"),
    colorPrincipal: leerTexto(datos, "colorPrincipal") || "#126783",
    colorFondo: leerTexto(datos, "colorFondo") || "#ffffff",
    colorTexto: leerTexto(datos, "colorTexto") || "#111111",
    logoUrl: leerTexto(datos, "logoUrl"),
    heroAlineacion: normalizarAlineacion(leerTexto(datos, "heroAlineacion")),
    whatsapp: leerTexto(datos, "whatsapp"),
    instagram: leerTexto(datos, "instagram"),
    hero,
    carruselAutomatico: datos.get("carruselAutomatico") === "on",
    secciones,
    serviciosDestacados: destacadosValidos.map((servicio) => servicio.id),
  };
  const borrador = {
    ...baseSinLocales,
    locales: { ...borradoresPorLocal, [sede.id]: borradorLocal },
  };

  await prisma.configuracionSitio.upsert({
    where: { negocioId: negocio.id },
    update: { borrador: borrador as Prisma.InputJsonValue },
    create: {
      negocioId: negocio.id,
      borrador: borrador as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/panel/mi-sitio");
  redirect(
    `/panel/mi-sitio?local=${encodeURIComponent(sede.id)}&sitio=guardado`,
  );
}

function limitarPorcentaje(valor: string, alternativa: number) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return alternativa;
  return Math.min(100, Math.max(0, numero));
}

function normalizarAlineacion(
  valor: string,
): "izquierda" | "centro" | "derecha" {
  return valor === "centro" || valor === "derecha" ? valor : "izquierda";
}

export async function publicarSitio() {
  const { negocio } = await requerirContextoPanel();
  const configuracion = await prisma.configuracionSitio.findUnique({
    where: { negocioId: negocio.id },
  });

  if (!configuracion) return;

  await prisma.$transaction([
    prisma.configuracionSitio.update({
      where: { negocioId: negocio.id },
      data: {
        publicada: configuracion.borrador as Prisma.InputJsonValue,
        publicadaEn: new Date(),
        version: { increment: 1 },
      },
    }),
    prisma.negocio.update({
      where: { id: negocio.id },
      data: { publicado: true },
    }),
  ]);

  revalidatePath("/panel/mi-sitio");
  revalidatePath(`/sitio/${negocio.slug}`);
  const sedes = await prisma.sede.findMany({
    where: { negocioId: negocio.id, activa: true },
    select: { subdominio: true },
  });
  for (const sede of sedes) {
    if (sede.subdominio) revalidatePath(`/sitio/${sede.subdominio}`);
  }
  redirect("/panel/mi-sitio?sitio=publicado");
}

function esMapa(
  valor: unknown,
): valor is Record<string, Record<string, unknown>> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}
