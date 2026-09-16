/** Centraliza los rubros permitidos durante la configuración inicial del negocio. */
export const RUBROS_NEGOCIO = [
  { valor: "peluqueria", nombre: "Peluquería" },
  { valor: "barberia", nombre: "Barbería" },
  { valor: "unas", nombre: "Uñas y manicuría" },
  { valor: "estetica", nombre: "Estética" },
  { valor: "spa", nombre: "Spa y bienestar" },
  { valor: "masajes", nombre: "Masajes" },
  { valor: "tatuajes", nombre: "Tatuajes" },
  { valor: "consultorios", nombre: "Consultorios" },
  { valor: "veterinarias", nombre: "Veterinarias" },
  { valor: "entrenamiento", nombre: "Entrenamiento" },
  { valor: "psicologia", nombre: "Psicología" },
  { valor: "odontologia", nombre: "Odontología" },
  { valor: "nutricion", nombre: "Nutrición" },
  { valor: "kinesiologia", nombre: "Kinesiología" },
  { valor: "oftalmologia", nombre: "Oftalmología" },
  { valor: "depilacion", nombre: "Depilación" },
  { valor: "maquillaje", nombre: "Maquillaje" },
] as const;

export const CANTIDADES_LOCALES = [
  { valor: 1, nombre: "1 local" },
  { valor: 2, nombre: "2 locales" },
  { valor: 3, nombre: "3 locales" },
  { valor: 4, nombre: "4 locales" },
  { valor: 5, nombre: "5 locales o más" },
] as const;

const nombresRubros: Record<string, string> = Object.fromEntries(
  RUBROS_NEGOCIO.map((rubro) => [rubro.valor, rubro.nombre]),
);

export function obtenerNombreRubro(tipoNegocio: string) {
  return nombresRubros[tipoNegocio] ?? "";
}

export function esRubroValido(tipoNegocio: string) {
  return RUBROS_NEGOCIO.some((rubro) => rubro.valor === tipoNegocio);
}

export function esCantidadLocalesValida(cantidad: number) {
  return CANTIDADES_LOCALES.some((opcion) => opcion.valor === cantidad);
}
