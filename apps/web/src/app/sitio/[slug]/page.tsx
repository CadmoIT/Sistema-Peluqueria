/** Resuelve el negocio solicitado y presenta su versión publicada o su suspensión. */
import { notFound } from "next/navigation";
import { PLANES, tieneAccesoOperativo } from "@turnos/config";
import {
  SitioPublico,
  SitioSuspendido,
  type DatosSitioPublico,
} from "@/componentes/sitio/sitio-publico";
import { obtenerSitioPublico } from "@/servicios/panel-datos.service";
import { SelectorSucursales } from "@/componentes/sitio/selector-sucursales";

const planPublicacionInicial =
  PLANES.find((plan) => plan.id === "autogestionado") ?? PLANES[0];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await obtenerSitioPublico(slug);
  if (negocio?.sitioRetiradoEn)
    return {
      title: "Sitio no disponible",
      robots: { index: false, follow: false },
    };
  return negocio
    ? {
        title: negocio.nombre,
        description:
          negocio.descripcion ?? `Reservá tu turno en ${negocio.nombre}`,
      }
    : {};
}

export default async function PaginaSitio({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; sedeId?: string }>;
  searchParams?: Promise<{ profesional?: string }>;
}) {
  const { slug, sedeId } = await params;
  const profesionalInicial = (await searchParams)?.profesional ?? "";
  const negocio = await obtenerSitioPublico(slug);
  if (!negocio) notFound();
  if (negocio.sitioRetiradoEn) notFound();
  if (!negocio.publicado || !tieneAccesoOperativo(negocio.suscripcion)) {
    return (
      <SitioSuspendido
        nombre={negocio.nombre}
        precio={planPublicacionInicial.precioMensual}
      />
    );
  }

  const publicadaBase = (negocio.configuracionSitio?.publicada ?? {}) as Record<
    string,
    unknown
  >;
  const sedeDelSubdominio = negocio.sedes.find(
    (sede) => sede.subdominio === slug,
  );
  const sedeSeleccionada = sedeId
    ? negocio.sedes.find((sede) => sede.id === sedeId)
    : (sedeDelSubdominio ??
      (negocio.sedes.length === 1 ? negocio.sedes[0] : undefined));
  if (sedeId && !sedeSeleccionada) notFound();
  if (
    profesionalInicial &&
    !negocio.profesionales.some(
      (p) =>
        p.id === profesionalInicial &&
        (!sedeSeleccionada ||
          p.sedes.some((s) => s.sedeId === sedeSeleccionada.id)),
    )
  )
    notFound();
  if (!sedeSeleccionada) {
    return (
      <SelectorSucursales
        nombre={negocio.nombre}
        slug={negocio.subdominio ?? negocio.slug}
        sedes={
          profesionalInicial
            ? negocio.sedes.filter((s) =>
                negocio.profesionales
                  .find((p) => p.id === profesionalInicial)
                  ?.sedes.some((a) => a.sedeId === s.id),
              )
            : negocio.sedes
        }
        profesionalInicial={profesionalInicial}
      />
    );
  }
  const configuracionesPorLocal = esMapa(publicadaBase.locales)
    ? publicadaBase.locales
    : {};
  const publicada = sedeSeleccionada
    ? {
        ...publicadaBase,
        ...(configuracionesPorLocal[sedeSeleccionada.id] ?? {}),
      }
    : publicadaBase;
  const cadena = (campo: string, alternativa = "") =>
    typeof publicada[campo] === "string"
      ? String(publicada[campo])
      : alternativa;
  const hero = normalizarHero(publicada.hero);
  const secciones = normalizarSecciones(
    publicada.secciones,
    publicada.versionSecciones,
  );
  const datos: DatosSitioPublico = {
    slug: negocio.slug,
    nombre: negocio.nombre,
    descripcion:
      negocio.descripcion ??
      "Reservá tu próximo turno de forma simple y rápida.",
    politicaContacto: negocio.politicaContacto,
    configuracion: {
      titulo: cadena("titulo", negocio.nombre),
      descripcion: cadena("descripcion", negocio.descripcion ?? ""),
      colorTitulo: cadena("colorTitulo", cadena("colorTexto", "#111111")),
      colorSubtitulo: cadena("colorSubtitulo", cadena("colorTexto", "#111111")),
      colorPrincipal: cadena("colorPrincipal", "#111111"),
      colorFondo: cadena("colorFondo", "#ffffff"),
      colorTexto: cadena("colorTexto", "#111111"),
      logoUrl: cadena("logoUrl"),
      whatsapp:
        cadena("whatsapp").trim() ||
        negocio.telefono?.trim() ||
        negocio.sedes.find((sede) => sede.telefono?.trim())?.telefono ||
        "",
      instagram: cadena("instagram"),
      googleMapsUrl: cadena(
        "googleMapsUrl",
        sedeSeleccionada?.googleMapsUrl ?? "",
      ),
      hero,
      secciones,
    },
    sedes: [sedeSeleccionada].map((sede) => ({
      id: sede.id,
      nombre: sede.nombre,
      subdominio: sede.subdominio,
      direccion: sede.direccion,
      telefono: sede.telefono,
      latitud: sede.latitud ? Number(sede.latitud) : null,
      longitud: sede.longitud ? Number(sede.longitud) : null,
      googlePuntaje: sede.googlePuntaje ? Number(sede.googlePuntaje) : null,
      googleResenas: sede.googleResenas,
      googleMapsUrl: sede.googleMapsUrl,
      horarios: sede.horarios,
    })),
    servicios: negocio.servicios
      .filter((servicio) =>
        servicio.sedes.some((sede) => sede.sedeId === sedeSeleccionada.id),
      )
      .map((servicio) => ({
        id: servicio.id,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
        categoria: servicio.categoria?.nombre ?? "General",
        duracionMinutos: servicio.duracionMinutos,
        precio: Number(servicio.precio),
        imagen: servicio.imagen,
        sedeIds: servicio.sedes.map((asignacion) => asignacion.sedeId),
        profesionalIds: servicio.profesionales.map(
          (asignacion) => asignacion.profesionalId,
        ),
      })),
    profesionales: negocio.profesionales
      .filter((profesional) =>
        profesional.sedes.some((sede) => sede.sedeId === sedeSeleccionada.id),
      )
      .map((profesional) => ({
        id: profesional.id,
        nombre: profesional.nombre,
        apellido: profesional.apellido,
        especialidad: profesional.especialidad,
        biografia: profesional.biografia,
        foto: profesional.foto,
        sedeIds: profesional.sedes.map((asignacion) => asignacion.sedeId),
        servicioIds: profesional.servicios.map(
          (asignacion) => asignacion.servicioId,
        ),
      })),
  };
  return (
    <>
      <p
        style={{
          maxWidth: 1280,
          margin: "24px auto 0",
          padding: "0 24px",
          color: "#527080",
          fontSize: 13,
        }}
      >
        Los precios publicados son de referencia. Elegís cómo pagar al llegar al
        local.
      </p>
      <SitioPublico datos={datos} profesionalInicial={profesionalInicial} />
    </>
  );
}

function esMapa(
  valor: unknown,
): valor is Record<string, Record<string, unknown>> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}

function normalizarHero(
  valor: unknown,
): DatosSitioPublico["configuracion"]["hero"] {
  if (!Array.isArray(valor)) return [];
  return valor
    .flatMap((imagen) => {
      if (typeof imagen === "string") {
        return imagen ? [{ url: imagen, alt: "", focoX: 50, focoY: 50 }] : [];
      }
      if (!imagen || typeof imagen !== "object") return [];
      const candidata = imagen as Record<string, unknown>;
      if (typeof candidata.url !== "string" || !candidata.url) return [];
      return [
        {
          url: candidata.url,
          alt: typeof candidata.alt === "string" ? candidata.alt : "",
          focoX: typeof candidata.focoX === "number" ? candidata.focoX : 50,
          focoY: typeof candidata.focoY === "number" ? candidata.focoY : 50,
        },
      ];
    })
    .slice(0, 1);
}

function normalizarSecciones(
  valor: unknown,
  version: unknown,
): DatosSitioPublico["configuracion"]["secciones"] {
  const permitidas: DatosSitioPublico["configuracion"]["secciones"] = [
    "servicios",
    "equipo",
    "contacto",
    "ubicacion",
  ];
  if (!Array.isArray(valor)) return permitidas;
  const secciones = valor.filter(
    (seccion): seccion is (typeof permitidas)[number] =>
      typeof seccion === "string" &&
      permitidas.includes(seccion as (typeof permitidas)[number]),
  );
  if (
    version !== 2 &&
    secciones.includes("ubicacion") &&
    !secciones.includes("contacto")
  ) {
    secciones.splice(secciones.indexOf("ubicacion"), 0, "contacto");
  }
  return secciones;
}
