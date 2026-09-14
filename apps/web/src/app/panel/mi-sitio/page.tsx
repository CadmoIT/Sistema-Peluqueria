/** Abre el editor persistente del micrositio con borrador y publicación explícita. */
import {
  EditorSitio,
  type BorradorSitio,
} from "@/componentes/panel/editor-sitio";
import { obtenerSitioEditable } from "@/servicios/panel-datos.service";

export const metadata = { title: "Mi sitio" };

export default async function PaginaMiSitio() {
  const datos = await obtenerSitioEditable();
  const base = (datos.configuracion?.borrador ?? {}) as Partial<BorradorSitio>;
  const inicial: BorradorSitio = {
    titulo: base.titulo ?? datos.negocio.nombre,
    descripcion:
      base.descripcion ??
      datos.negocio.descripcion ??
      "Reservá tu próximo turno de forma simple y rápida.",
    colorPrincipal: base.colorPrincipal ?? "#126783",
    colorFondo: base.colorFondo ?? "#ffffff",
    colorTexto: base.colorTexto ?? "#111111",
    logoUrl: base.logoUrl ?? "",
    whatsapp: base.whatsapp ?? datos.negocio.telefono ?? "",
    instagram: base.instagram ?? "",
    hero: normalizarHero(base.hero),
    carruselAutomatico: base.carruselAutomatico ?? true,
    secciones: normalizarSecciones(base.secciones),
    serviciosDestacados: Array.isArray(base.serviciosDestacados)
      ? base.serviciosDestacados.filter(
          (valor): valor is string => typeof valor === "string",
        )
      : [],
  };
  return (
    <div className="panel-contenido panel-contenido--editor">
      <header className="cabecera-seccion">
        <div>
          <h1>Mi sitio</h1>
          <p>Personalizá, revisá y publicá tu página de reservas.</p>
        </div>
        <span className="direccion-sitio">
          {datos.negocio.slug}.site.turnosrapidos.com.ar
        </span>
      </header>
      <EditorSitio
        inicial={inicial}
        slug={datos.negocio.slug}
        servicios={datos.servicios.map((servicio) => ({
          id: servicio.id,
          nombre: servicio.nombre,
          precio: Number(servicio.precio),
          categoria: servicio.categoria?.nombre ?? "General",
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
          direccion: sede.direccion,
          telefono: sede.telefono,
          googlePuntaje: sede.googlePuntaje ? Number(sede.googlePuntaje) : null,
          googleResenas: sede.googleResenas,
        }))}
      />
    </div>
  );
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
  });
}

function normalizarSecciones(valor: unknown): BorradorSitio["secciones"] {
  const permitidas: BorradorSitio["secciones"] = [
    "servicios",
    "equipo",
    "ubicacion",
  ];
  if (!Array.isArray(valor)) return permitidas;
  return valor.filter(
    (seccion): seccion is BorradorSitio["secciones"][number] =>
      typeof seccion === "string" && permitidas.includes(seccion as never),
  );
}
