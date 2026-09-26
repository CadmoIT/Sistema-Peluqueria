/** Persiste el borrador visual del micrositio sin depender de una redirección. */
import { Prisma } from "@prisma/client";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function persistirBorradorSitio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const sedeId = leerTexto(datos, "localId");
  const sede = await prisma.sede.findFirst({
    where: { id: sedeId, negocioId: negocio.id, activa: true },
    select: { id: true },
  });
  if (!sede) throw new Error("El local seleccionado no es válido.");

  const anterior = await prisma.configuracionSitio.findUnique({
    where: { negocioId: negocio.id },
  });
  const base = (anterior?.borrador ?? {}) as Record<string, unknown>;
  const borradoresPorLocal = esMapa(base.locales) ? base.locales : {};
  const baseSinLocales = Object.fromEntries(
    Object.entries(base).filter(
      ([clave]) =>
        clave !== "locales" &&
        clave !== "serviciosDestacados" &&
        ![
          "fuenteTitulo",
          "fuenteSubtitulo",
          "fuenteTexto",
          "tamanoTitulo",
          "tamanoSubtitulo",
          "tamanoTexto",
        ].includes(clave),
    ),
  );
  const borradorLocalAnterior = borradoresPorLocal[sede.id] ?? {};
  const googleMapsUrl = validarEnlaceGoogleMaps(
    leerTexto(datos, "googleMapsUrl").slice(0, 500),
  );
  const seccionesPermitidas = ["servicios", "equipo", "contacto", "ubicacion"];
  const secciones = datos
    .getAll("secciones")
    .map(String)
    .filter((seccion) => seccionesPermitidas.includes(seccion));
  const hero = [
    {
      url: leerTexto(datos, "hero1"),
      alt: "",
      focoX: limitarPorcentaje(leerTexto(datos, "heroFocoX1"), 50),
      focoY: limitarPorcentaje(leerTexto(datos, "heroFocoY1"), 50),
    },
  ].filter((imagen) => imagen.url);
  const borradorLocal = {
    ...baseSinLocales,
    titulo: leerTexto(datos, "titulo") || negocio.nombre,
    descripcion: leerTexto(datos, "descripcion"),
    colorTitulo: leerColor(
      datos,
      "colorTitulo",
      leerColorAnterior(
        borradorLocalAnterior,
        "colorTitulo",
        leerColorAnterior(borradorLocalAnterior, "colorTexto", "#111111"),
      ),
    ),
    colorSubtitulo: leerColor(
      datos,
      "colorSubtitulo",
      leerColorAnterior(
        borradorLocalAnterior,
        "colorSubtitulo",
        leerColorAnterior(borradorLocalAnterior, "colorTexto", "#111111"),
      ),
    ),
    colorPrincipal: leerColor(
      datos,
      "colorPrincipal",
      leerColorAnterior(borradorLocalAnterior, "colorPrincipal", "#111111"),
    ),
    colorFondo: leerColor(
      datos,
      "colorFondo",
      leerColorAnterior(borradorLocalAnterior, "colorFondo", "#ffffff"),
    ),
    colorTexto: leerColor(
      datos,
      "colorTexto",
      leerColorAnterior(borradorLocalAnterior, "colorTexto", "#111111"),
    ),
    logoUrl: leerTexto(datos, "logoUrl"),
    whatsapp: leerTexto(datos, "whatsapp"),
    instagram: leerTexto(datos, "instagram"),
    googleMapsUrl,
    hero,
    secciones,
    versionSecciones: 2,
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
  return { negocio, sedeId: sede.id };
}

function validarEnlaceGoogleMaps(valor: string) {
  if (!valor) return "";

  try {
    const url = new URL(valor);
    const dominioPermitido =
      /(^|\.)google\.com$/i.test(url.hostname) ||
      url.hostname === "maps.app.goo.gl" ||
      url.hostname === "goo.gl";
    if (url.protocol !== "https:" || !dominioPermitido) {
      throw new Error("El enlace debe ser de Google Maps.");
    }
    return url.toString();
  } catch {
    throw new Error("Ingresá un enlace válido de Google Maps.");
  }
}

/** Publica el último borrador guardado y devuelve los datos necesarios para invalidar las vistas. */
export async function publicarBorradorSitio() {
  const { negocio } = await requerirContextoPanel();
  const configuracion = await prisma.configuracionSitio.findUnique({
    where: { negocioId: negocio.id },
    select: { borrador: true },
  });

  if (!configuracion) throw new Error("No hay un borrador para publicar.");

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

  const sedes = await prisma.sede.findMany({
    where: { negocioId: negocio.id, activa: true },
    select: { subdominio: true },
  });

  return {
    negocio,
    subdominios: sedes.flatMap((sede) =>
      sede.subdominio ? [sede.subdominio] : [],
    ),
  };
}

function limitarPorcentaje(valor: string, alternativa: number) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return alternativa;
  return Math.min(100, Math.max(0, numero));
}

function leerColor(datos: FormData, nombre: string, alternativa: string) {
  const valor = leerTexto(datos, nombre);
  return /^#[0-9a-f]{6}$/i.test(valor) ? valor : alternativa;
}

function leerColorAnterior(
  borrador: Record<string, unknown>,
  nombre: string,
  alternativa: string,
) {
  const valor = borrador[nombre];
  return typeof valor === "string" && /^#[0-9a-f]{6}$/i.test(valor)
    ? valor
    : alternativa;
}

function esMapa(
  valor: unknown,
): valor is Record<string, Record<string, unknown>> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}
