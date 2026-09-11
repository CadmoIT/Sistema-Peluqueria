/** Ofrece conversiones pequeñas y consistentes para los formularios del servidor. */
export function leerTexto(datos: FormData, nombre: string) {
  return String(datos.get(nombre) ?? "").trim();
}

export function textoOpcional(valor: string) {
  return valor || null;
}

export function leerNumero(
  datos: FormData,
  nombre: string,
  valorPredeterminado = 0,
) {
  const valor = Number(datos.get(nombre) ?? valorPredeterminado);
  return Number.isFinite(valor) ? valor : valorPredeterminado;
}
