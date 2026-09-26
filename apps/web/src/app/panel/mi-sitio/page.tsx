/** Abre el editor persistente del micrositio para el local elegido. */
import {
  EditorSitio,
  type BorradorSitio,
} from "@/componentes/panel/editor-sitio";
import { SelectorLocalSitio } from "@/componentes/panel/selector-local-sitio";
import { BotonGuardarSitio } from "@/componentes/panel/boton-guardar-sitio";
import { BotonPublicarSitio } from "@/componentes/panel/boton-publicar-sitio";
import { obtenerSitioEditable } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { ExternalLink } from "lucide-react";
import { enlaceSitioPublico } from "@/lib/dominios-publicos";

export const metadata = { title: "Mi sitio" };

export default async function PaginaMiSitio({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const datos = await obtenerSitioEditable();
  const parametros = await searchParams;
  const localSeleccionado =
    datos.sedes.find((sede) => sede.id === parametros.local) ?? datos.sedes[0];
  const bruto = (datos.configuracion?.borrador ?? {}) as Record<
    string,
    unknown
  >;
  const borradoresPorLocal = esMapa(bruto.locales) ? bruto.locales : {};
  const base = {
    ...bruto,
    ...(localSeleccionado
      ? borradoresPorLocal[localSeleccionado.id]
      : undefined),
  } as Partial<BorradorSitio>;
  const inicial: BorradorSitio = {
    titulo: base.titulo ?? datos.negocio.nombre,
    descripcion:
      base.descripcion ??
      datos.negocio.descripcion ??
      "Reservá tu próximo turno de forma simple y rápida.",
    colorTitulo: base.colorTitulo ?? base.colorTexto ?? "#111111",
    colorSubtitulo: base.colorSubtitulo ?? base.colorTexto ?? "#111111",
    colorPrincipal: base.colorPrincipal ?? "#111111",
    colorFondo: base.colorFondo ?? "#ffffff",
    colorTexto: base.colorTexto ?? "#111111",
    logoUrl: base.logoUrl ?? "",
    whatsapp:
      base.whatsapp?.trim() ||
      datos.negocio.telefono?.trim() ||
      datos.sedes.find((sede) => sede.telefono?.trim())?.telefono ||
      "",
    instagram: base.instagram ?? "",
    googleMapsUrl:
      base.googleMapsUrl ?? localSeleccionado?.googleMapsUrl ?? "",
    hero: normalizarHero(base.hero),
    secciones: normalizarSecciones(base.secciones, base.versionSecciones),
    versionSecciones: 2,
  };
  return (
    <div className="panel-contenido panel-contenido--editor">
      <VistaPanelLista ruta="/panel/mi-sitio" />
      <header className="cabecera-seccion">
        <h1>Mi sitio</h1>
        <div className="mi-sitio-acciones">
          {datos.sedes.length > 1 && (
            <SelectorLocalSitio
              locales={datos.sedes.map((sede) => ({
                id: sede.id,
                nombre: sede.nombre,
              }))}
              valor={localSeleccionado?.id ?? ""}
            />
          )}
          <BotonGuardarSitio />
          <div className="mi-sitio-publicar">
            <BotonPublicarSitio />
          </div>
          <a
            className="mi-sitio-pagina-web"
            href={enlaceSitioPublico(
              localSeleccionado?.subdominio ?? datos.negocio.slug,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Página Web
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </header>
      <EditorSitio
        inicial={inicial}
        localId={localSeleccionado?.id ?? ""}
        servicios={datos.servicios.map((servicio) => ({
          id: servicio.id,
          nombre: servicio.nombre,
          precio: Number(servicio.precio),
          categoria: servicio.categoria?.nombre ?? "General",
          descripcion: servicio.descripcion,
          duracionMinutos: servicio.duracionMinutos,
          imagen: servicio.imagen,
        }))}
        profesionales={datos.profesionales.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          apellido: p.apellido,
          foto: p.foto,
          especialidad: p.especialidad,
        }))}
        locales={datos.sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
          subdominio: sede.subdominio,
          direccion: sede.direccion,
          telefono: sede.telefono,
          googleMapsUrl: sede.googleMapsUrl,
          googlePuntaje: sede.googlePuntaje ? Number(sede.googlePuntaje) : null,
          googleResenas: sede.googleResenas,
          horarios: sede.horarios.map((horario) => ({
            diaSemana: horario.diaSemana,
            abre: horario.abre,
            cierra: horario.cierra,
            activo: horario.activo,
          })),
        }))}
      />
    </div>
  );
}

function esMapa(
  valor: unknown,
): valor is Record<string, Partial<BorradorSitio>> {
  return Boolean(valor && typeof valor === "object" && !Array.isArray(valor));
}

function normalizarHero(valor: unknown): BorradorSitio["hero"] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((imagen) => {
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
  }).slice(0, 1);
}

function normalizarSecciones(
  valor: unknown,
  version: unknown,
): BorradorSitio["secciones"] {
  const permitidas: BorradorSitio["secciones"] = [
    "servicios",
    "equipo",
    "contacto",
    "ubicacion",
  ];
  if (!Array.isArray(valor)) return permitidas;
  const secciones = valor.filter(
    (seccion): seccion is BorradorSitio["secciones"][number] =>
      typeof seccion === "string" && permitidas.includes(seccion as never),
  );
  if (version !== 2 && secciones.includes("ubicacion") && !secciones.includes("contacto")) {
    secciones.splice(secciones.indexOf("ubicacion"), 0, "contacto");
  }
  return secciones;
}
