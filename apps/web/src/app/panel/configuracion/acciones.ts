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
  redirect("/panel/configuracion/negocio?configuracion=guardada");
}

export async function actualizarImagenPerfil(datos: FormData) {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!puedeCambiarTipoNegocio(membresia.rol)) {
    redirect("/panel/configuracion/negocio?configuracion=imagen-sin-permiso");
  }
  const imagen = textoOpcional(leerTexto(datos, "imagenPerfil").slice(0, 2000));
  if (imagen && !imagen.startsWith("/") && !/^https?:\/\//i.test(imagen)) {
    redirect("/panel/configuracion/negocio?configuracion=imagen-invalida");
  }
  const anterior =
    negocio.configuracion && typeof negocio.configuracion === "object"
      ? (negocio.configuracion as Record<string, unknown>)
      : {};
  await prisma.negocio.update({
    where: { id: negocio.id },
    data: { configuracion: { ...anterior, imagenPerfil: imagen ?? "" } },
  });
  revalidatePath("/panel", "layout");
  revalidatePath("/panel/configuracion/negocio");
  redirect("/panel/configuracion/negocio?configuracion=imagen-guardada");
}

export async function actualizarSede(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const googleMapsUrl = textoOpcional(
    leerTexto(datos, "googleMapsUrl").slice(0, 500),
  );
  const lugarGoogle = await resolverLugarGoogleMaps(googleMapsUrl);
  const consultaGoogle = extraerConsultaGoogleMaps(googleMapsUrl);

  await prisma.sede.updateMany({
    where: { id, negocioId: negocio.id },
    data: {
      nombre: leerTexto(datos, "nombre"),
      direccion: leerTexto(datos, "direccion") || lugarGoogle?.direccion || consultaGoogle || "",
      telefono: textoOpcional(leerTexto(datos, "telefono")),
      googlePlaceId: googleMapsUrl ? lugarGoogle?.id : null,
      googleMapsUrl,
      ...(lugarGoogle
        ? {
            latitud: lugarGoogle.latitud,
            longitud: lugarGoogle.longitud,
            googlePuntaje: lugarGoogle.puntaje,
            googleResenas: lugarGoogle.resenas,
            googleActualizadoEn: new Date(),
          }
        : googleMapsUrl
          ? {}
          : {
              latitud: null,
              longitud: null,
              googlePuntaje: null,
              googleResenas: null,
              googleActualizadoEn: null,
            }),
    },
  });

  revalidatePath("/panel/configuracion/locales");
  revalidatePath(`/sitio/${negocio.slug}`);
  redirect("/panel/configuracion/locales?configuracion=local-guardado");
}

/** Actualiza los horarios generales de una sede, sin modificar los horarios de profesionales. */
export async function actualizarHorariosSede(datos: FormData) {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!puedeCambiarTipoNegocio(membresia.rol)) {
    redirect("/panel/configuracion/horarios?configuracion=horarios-sin-permiso");
  }

  const sedeId = leerTexto(datos, "sedeId");
  const sede = await prisma.sede.findFirst({
    where: { id: sedeId, negocioId: negocio.id, activa: true },
    select: { id: true },
  });
  if (!sede) {
    redirect("/panel/configuracion/horarios?configuracion=horarios-error");
  }

  const horarios = Array.from({ length: 7 }, (_, diaSemana) => {
    const activo = datos.get(`activo-${diaSemana}`) === "on";
    const abre = horaConfiguracionValida(
      leerTexto(datos, `abre-${diaSemana}`),
      "09:00",
    );
    const cierra = horaConfiguracionValida(
      leerTexto(datos, `cierra-${diaSemana}`),
      "18:00",
    );
    return { diaSemana, activo, abre, cierra };
  });

  if (horarios.some((horario) => horario.activo && horario.abre >= horario.cierra)) {
    redirect("/panel/configuracion/horarios?configuracion=horarios-error");
  }

  await prisma.$transaction(async (tx) => {
    for (const horario of horarios) {
      const existente = await tx.horarioSede.findFirst({
        where: { sedeId: sede.id, negocioId: negocio.id, diaSemana: horario.diaSemana },
        select: { id: true },
      });
      if (existente) {
        await tx.horarioSede.update({
          where: { id: existente.id },
          data: { abre: horario.abre, cierra: horario.cierra, activo: horario.activo },
        });
      } else {
        await tx.horarioSede.create({
          data: { negocioId: negocio.id, sedeId: sede.id, ...horario },
        });
      }
    }
  });

  revalidatePath("/panel/configuracion/horarios");
  revalidatePath("/panel/agenda");
  revalidatePath(`/sitio/${negocio.slug}`);
  redirect("/panel/configuracion/horarios?configuracion=horarios-guardados");
}

function horaConfiguracionValida(valor: string, alternativa: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor) ? valor : alternativa;
}

export async function crearSede(datos: FormData) {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!puedeCambiarTipoNegocio(membresia.rol)) {
    redirect("/panel/configuracion/locales?configuracion=local-sin-permiso");
  }

  const nombre = leerTexto(datos, "nombre").slice(0, 100);
  const direccionIngresada = leerTexto(datos, "direccion").slice(0, 240);
  const telefono = textoOpcional(
    leerTexto(datos, "telefono").slice(0, 50),
  );
  const googleMapsUrl = textoOpcional(
    leerTexto(datos, "googleMapsUrl").slice(0, 500),
  );
  const lugarGoogle = await resolverLugarGoogleMaps(googleMapsUrl);
  const consultaGoogle = extraerConsultaGoogleMaps(googleMapsUrl);

  if (nombre.length < 2) {
    redirect("/panel/configuracion/locales?configuracion=local-error");
  }

  const existente = await prisma.sede.findFirst({
    where: { negocioId: negocio.id, nombre },
    select: { id: true },
  });
  if (existente) {
    redirect("/panel/configuracion/locales?configuracion=local-duplicado");
  }

  await prisma.sede.create({
    data: {
      negocioId: negocio.id,
      nombre,
      direccion: direccionIngresada || lugarGoogle?.direccion || consultaGoogle || "",
      telefono,
      googleMapsUrl,
      ...(lugarGoogle
        ? {
            googlePlaceId: lugarGoogle.id,
            latitud: lugarGoogle.latitud,
            longitud: lugarGoogle.longitud,
            googlePuntaje: lugarGoogle.puntaje,
            googleResenas: lugarGoogle.resenas,
            googleActualizadoEn: new Date(),
          }
        : {}),
    },
  });

  revalidatePath("/panel/configuracion/locales");
  revalidatePath("/panel", "layout");
  revalidatePath(`/sitio/${negocio.slug}`);
  redirect("/panel/configuracion/locales?configuracion=local-creado");
}

type LugarGoogle = {
  id: string;
  direccion: string;
  latitud: number;
  longitud: number;
  puntaje: number | null;
  resenas: number | null;
};

/** Resuelve el enlace compartido de Maps con Places API, sin pedir un Place ID técnico. */
async function resolverLugarGoogleMaps(enlace: string | null): Promise<LugarGoogle | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const consulta = extraerConsultaGoogleMaps(enlace);
  if (!apiKey || !consulta) return null;

  try {
    const respuesta = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.formattedAddress,places.location,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: consulta, languageCode: "es", regionCode: "AR", maxResultCount: 1 }),
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as {
      places?: Array<{
        id?: string;
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
      }>;
    };
    const lugar = datos.places?.[0];
    if (!lugar?.id || lugar.location?.latitude == null || lugar.location.longitude == null) return null;
    return {
      id: lugar.id,
      direccion: lugar.formattedAddress ?? "",
      latitud: lugar.location.latitude,
      longitud: lugar.location.longitude,
      puntaje: lugar.rating ?? null,
      resenas: lugar.userRatingCount ?? null,
    };
  } catch {
    return null;
  }
}

function extraerConsultaGoogleMaps(enlace: string | null) {
  if (!enlace) return null;
  try {
    const url = new URL(enlace);
    const host = url.hostname.toLowerCase();
    const esGoogle = host === "maps.app.goo.gl" || host.endsWith(".google.com") || host.endsWith(".google.com.ar") || host === "google.com" || host.endsWith(".goo.gl");
    if (!esGoogle) return null;
    const consulta = url.searchParams.get("query") ?? url.searchParams.get("q");
    if (consulta?.trim()) return consulta.trim();
    const lugar = url.pathname.match(/\/place\/([^/]+)/i)?.[1];
    return lugar ? decodeURIComponent(lugar).replace(/\+/g, " ").trim() : null;
  } catch {
    return null;
  }
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
      Array.from(valor.matchAll(/\{([^}]+)\}|\(([^)]+)\)/g)).every((grupo) =>
        variablesAviso.has(grupo[1] ?? grupo[2] ?? ""),
      )
    );
  });
  if (!validos)
    redirect("/panel/configuracion/avisos?configuracion=avisos-error");

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
  revalidatePath("/panel/configuracion/avisos");
  redirect("/panel/configuracion/avisos?configuracion=avisos-guardados");
}
