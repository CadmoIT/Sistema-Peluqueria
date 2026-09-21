/** Define el orden y las columnas visibles del historial de compras. */
export const columnasComprasBase = ["fecha", "proveedor", "local", "productos", "total"];
export const nombresColumnasCompras: Record<string, string> = {
  fecha: "Fecha",
  proveedor: "Proveedor",
  local: "Local",
  productos: "Productos",
  total: "Total",
};

export function resolverColumnasCompras(configuracion: unknown, variosLocales: boolean) {
  const config = configuracion && typeof configuracion === "object" ? configuracion as Record<string, unknown> : {};
  const elegidas = Array.isArray(config.columnasCompras) ? config.columnasCompras.filter((columna): columna is string => typeof columna === "string") : columnasComprasBase;
  const validas = new Set(Object.keys(nombresColumnasCompras));
  const orden = [...new Set(elegidas)].filter((columna) => validas.has(columna) && (columna !== "local" || variosLocales));
  for (const obligatoria of ["fecha", "productos", "total"]) if (!orden.includes(obligatoria)) orden.push(obligatoria);
  return orden;
}
