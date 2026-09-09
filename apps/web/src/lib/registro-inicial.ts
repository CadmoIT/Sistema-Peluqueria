/** Comparte los datos mínimos elegidos al registrarse con el asistente del negocio. */
export const CLAVE_REGISTRO_NEGOCIO = "turnosrapidos-registro-negocio";

export type RegistroNegocioInicial = {
  tipoNegocio: string;
  cantidadLocales: string;
};

const nombresRubros: Record<string, string> = {
  peluqueria: "Peluquería",
  barberia: "Barbería",
  unas: "Uñas y manicuría",
  estetica: "Estética",
  spa: "Spa y bienestar",
  otro: "Otro negocio con turnos",
};

export function obtenerNombreRubro(tipoNegocio: string) {
  return nombresRubros[tipoNegocio] ?? "";
}
