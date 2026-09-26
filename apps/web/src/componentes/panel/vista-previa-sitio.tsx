/** Adapta el borrador a la plantilla pública para mantener una vista fiel. */
import {
  SitioPublico,
  type DatosSitioPublico,
} from "@/componentes/sitio/sitio-publico";
import type { BorradorSitio } from "@/componentes/panel/editor-sitio";

type Local = {
  id: string;
  nombre: string;
  subdominio?: string | null;
  direccion: string;
  telefono: string | null;
  googleMapsUrl: string | null;
  googlePuntaje: number | null;
  googleResenas: number | null;
  horarios?: Array<{
    diaSemana: number;
    abre: string;
    cierra: string;
    activo: boolean;
  }>;
};

type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  descripcion: string | null;
  duracionMinutos: number;
  imagen: string | null;
};

type Profesional = {
  id: string;
  nombre: string;
  apellido: string | null;
  foto: string | null;
  especialidad: string | null;
};

export function VistaPreviaSitio({
  datos,
  servicios,
  profesionales,
  locales,
  localId,
}: {
  datos: BorradorSitio;
  servicios: Servicio[];
  profesionales: Profesional[];
  locales: Local[];
  localId: string;
}) {
  const local = locales.find((item) => item.id === localId) ?? locales[0];
  const datosPublicos: DatosSitioPublico = {
    slug: local?.subdominio ?? "vista-previa",
    nombre: datos.titulo,
    descripcion: datos.descripcion,
    politicaContacto: "CUALQUIERA",
    configuracion: {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      colorTitulo: datos.colorTitulo,
      colorSubtitulo: datos.colorSubtitulo,
      colorPrincipal: datos.colorPrincipal,
      colorFondo: datos.colorFondo,
      colorTexto: datos.colorTexto,
      logoUrl: datos.logoUrl,
      whatsapp: datos.whatsapp,
      instagram: datos.instagram,
      googleMapsUrl: datos.googleMapsUrl,
      hero: datos.hero,
      secciones: datos.secciones,
    },
    sedes: local
      ? [
          {
            id: local.id,
            nombre: local.nombre,
            subdominio: local.subdominio ?? null,
            direccion: local.direccion,
            telefono: local.telefono,
            latitud: null,
            longitud: null,
            googlePuntaje: local.googlePuntaje,
            googleResenas: local.googleResenas,
            googleMapsUrl: local.googleMapsUrl,
            horarios: local.horarios ?? [],
          },
        ]
      : [],
    servicios: servicios.map((servicio) => ({
      ...servicio,
      sedeIds: local ? [local.id] : [],
      profesionalIds: profesionales.map((profesional) => profesional.id),
    })),
    profesionales: profesionales.map((profesional) => ({
      ...profesional,
      biografia: null,
      sedeIds: local ? [local.id] : [],
      servicioIds: servicios.map((servicio) => servicio.id),
    })),
  };

  return <SitioPublico datos={datosPublicos} modoVistaPrevia />;
}
