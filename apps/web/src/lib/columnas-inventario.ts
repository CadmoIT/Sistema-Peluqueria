/** Define columnas editables sin alterar el stock ni los cálculos de productos. */
export type ColumnaLibre = { id: string; nombre: string; tipo: "TEXTO" | "NUMERO" | "FECHA"; orden: number };
export const columnasBase = ["nombre", "precio", "cantidad", "local", "acciones"];
export const nombresColumnas: Record<string, string> = { nombre: "Nombre", precio: "Precio", cantidad: "Cantidad", local: "Local", acciones: "Acciones", sku: "SKU", costo: "Costo" };
export function resolverColumnas(configuracion: unknown, libres: ColumnaLibre[], variosLocales: boolean) {
  const config = configuracion && typeof configuracion === "object" ? configuracion as Record<string, unknown> : {};
  const elegidas = Array.isArray(config.columnasInventario) ? config.columnasInventario.filter((c): c is string => typeof c === "string") : columnasBase;
  const validas = new Set([...Object.keys(nombresColumnas), ...libres.map((c) => c.id)]);
  const orden = [...new Set(elegidas)].filter((c) => validas.has(c) && (c !== "local" || variosLocales));
  for (const obligatoria of ["nombre", "cantidad", "acciones"]) if (!orden.includes(obligatoria)) orden.push(obligatoria);
  return orden;
}
export function valorColumna(tipo: ColumnaLibre["tipo"], entrada: string): string | number | null {
  const texto = entrada.trim();
  if (!texto) return null;
  if (tipo === "NUMERO") { const numero = Number(texto); if (!Number.isFinite(numero)) throw new Error("Escribí un número válido."); return numero; }
  if (tipo === "FECHA") {
    const fecha = new Date(`${texto}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) throw new Error("Elegí una fecha válida.");
  }
  if (texto.length > 500) throw new Error("La columna admite hasta 500 caracteres.");
  return texto;
}
