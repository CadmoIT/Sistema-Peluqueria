/** Ofrece conversiones pequeñas y consistentes para los formularios del servidor. */
export function leerTexto(datos: FormData, nombre: string) {
  return String(datos.get(nombre) ?? "").trim();
}

export function textoOpcional(valor: string) {
  return valor || null;
}
