/** Define las pequeñas adaptaciones de cada rubro sin duplicar la interfaz del panel. */
import { RUBROS_NEGOCIO } from "./registro-inicial";

export type TipoNegocio = (typeof RUBROS_NEGOCIO)[number]["valor"];
export type TipoPerfilNegocio = TipoNegocio | "general";
export type IconoServicio =
  | "Scissors"
  | "Paintbrush"
  | "Sparkles"
  | "Flower2"
  | "Hand"
  | "PenTool"
  | "Stethoscope"
  | "PawPrint"
  | "Dumbbell"
  | "Psicologia"
  | "Odontologia"
  | "Nutricion"
  | "Kinesiologia"
  | "Oftalmologia"
  | "Depilacion"
  | "Maquillaje"
  | "Briefcase";
export type PerfilNegocio = {
  tipoNegocio: TipoPerfilNegocio;
  iconoServicios: IconoServicio;
  ejemploServicio: string;
  ejemploCategoria: string;
  ejemploNegocio: string;
};

export const PERFILES_NEGOCIO = {
  peluqueria: {
    tipoNegocio: "peluqueria",
    iconoServicios: "Scissors",
    ejemploServicio: "Corte de cabello",
    ejemploCategoria: "Cabello",
    ejemploNegocio: "Peluquería Aurora",
  },
  barberia: {
    tipoNegocio: "barberia",
    iconoServicios: "Scissors",
    ejemploServicio: "Perfilado de barba",
    ejemploCategoria: "Barba",
    ejemploNegocio: "Barbería Aurora",
  },
  unas: {
    tipoNegocio: "unas",
    iconoServicios: "Paintbrush",
    ejemploServicio: "Manicuría",
    ejemploCategoria: "Uñas",
    ejemploNegocio: "Aurora Nails",
  },
  estetica: {
    tipoNegocio: "estetica",
    iconoServicios: "Sparkles",
    ejemploServicio: "Limpieza facial",
    ejemploCategoria: "Facial",
    ejemploNegocio: "Estética Aurora",
  },
  spa: {
    tipoNegocio: "spa",
    iconoServicios: "Flower2",
    ejemploServicio: "Circuito de spa",
    ejemploCategoria: "Bienestar",
    ejemploNegocio: "Aurora Spa",
  },
  masajes: {
    tipoNegocio: "masajes",
    iconoServicios: "Hand",
    ejemploServicio: "Masaje descontracturante",
    ejemploCategoria: "Masajes",
    ejemploNegocio: "Espacio Aurora",
  },
  tatuajes: {
    tipoNegocio: "tatuajes",
    iconoServicios: "PenTool",
    ejemploServicio: "Sesión de tatuaje",
    ejemploCategoria: "Tatuajes",
    ejemploNegocio: "Aurora Tattoo",
  },
  consultorios: {
    tipoNegocio: "consultorios",
    iconoServicios: "Stethoscope",
    ejemploServicio: "Consulta",
    ejemploCategoria: "Consultas",
    ejemploNegocio: "Consultorio Aurora",
  },
  veterinarias: {
    tipoNegocio: "veterinarias",
    iconoServicios: "PawPrint",
    ejemploServicio: "Consulta veterinaria",
    ejemploCategoria: "Consultas",
    ejemploNegocio: "Veterinaria Aurora",
  },
  entrenamiento: {
    tipoNegocio: "entrenamiento",
    iconoServicios: "Dumbbell",
    ejemploServicio: "Entrenamiento personalizado",
    ejemploCategoria: "Entrenamiento",
    ejemploNegocio: "Aurora Entrenamiento",
  },
  psicologia: {
    tipoNegocio: "psicologia",
    iconoServicios: "Psicologia",
    ejemploServicio: "Sesión de psicología",
    ejemploCategoria: "Psicología",
    ejemploNegocio: "Espacio Mente Aurora",
  },
  odontologia: {
    tipoNegocio: "odontologia",
    iconoServicios: "Odontologia",
    ejemploServicio: "Consulta odontológica",
    ejemploCategoria: "Odontología",
    ejemploNegocio: "Sonrisa Aurora",
  },
  nutricion: {
    tipoNegocio: "nutricion",
    iconoServicios: "Nutricion",
    ejemploServicio: "Consulta nutricional",
    ejemploCategoria: "Nutrición",
    ejemploNegocio: "Nutrición Aurora",
  },
  kinesiologia: {
    tipoNegocio: "kinesiologia",
    iconoServicios: "Kinesiologia",
    ejemploServicio: "Sesión de kinesiología",
    ejemploCategoria: "Kinesiología",
    ejemploNegocio: "Movimiento Aurora",
  },
  oftalmologia: {
    tipoNegocio: "oftalmologia",
    iconoServicios: "Oftalmologia",
    ejemploServicio: "Control oftalmológico",
    ejemploCategoria: "Oftalmología",
    ejemploNegocio: "Visión Aurora",
  },
  depilacion: {
    tipoNegocio: "depilacion",
    iconoServicios: "Depilacion",
    ejemploServicio: "Depilación de piernas",
    ejemploCategoria: "Depilación",
    ejemploNegocio: "Depilación Aurora",
  },
  maquillaje: {
    tipoNegocio: "maquillaje",
    iconoServicios: "Maquillaje",
    ejemploServicio: "Maquillaje social",
    ejemploCategoria: "Maquillaje",
    ejemploNegocio: "Makeup Aurora",
  },
  general: {
    tipoNegocio: "general",
    iconoServicios: "Briefcase",
    ejemploServicio: "Servicio personalizado",
    ejemploCategoria: "General",
    ejemploNegocio: "Estudio Abril",
  },
} as const satisfies Record<TipoPerfilNegocio, PerfilNegocio>;

export function esTipoNegocio(valor: unknown): valor is TipoNegocio {
  return (
    typeof valor === "string" &&
    RUBROS_NEGOCIO.some(({ valor: tipo }) => tipo === valor)
  );
}

function normalizarNombre(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function obtenerPerfilNegocio(configuracion: unknown): PerfilNegocio {
  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  )
    return PERFILES_NEGOCIO.general;
  const datos = configuracion as Record<string, unknown>;
  if (esTipoNegocio(datos.tipoNegocio))
    return PERFILES_NEGOCIO[datos.tipoNegocio];
  // Sólo una clave ausente permite recurrir al nombre antiguo del rubro.
  if (datos.tipoNegocio == null || datos.tipoNegocio === "") {
    const nombre =
      typeof datos.rubro === "string" ? normalizarNombre(datos.rubro) : "";
    const rubro = RUBROS_NEGOCIO.find(
      ({ nombre: actual, valor }) =>
        normalizarNombre(actual) === nombre || valor === nombre,
    );
    if (rubro) return PERFILES_NEGOCIO[rubro.valor];
  }
  return PERFILES_NEGOCIO.general;
}

export function puedeCambiarTipoNegocio(rol: string) {
  return rol === "DUENO" || rol === "ADMINISTRADOR";
}

export function cambiosTipoNegocio(tipoNegocio: TipoNegocio) {
  return {
    tipoNegocio,
    rubro: RUBROS_NEGOCIO.find(({ valor }) => valor === tipoNegocio)!.nombre,
  };
}
