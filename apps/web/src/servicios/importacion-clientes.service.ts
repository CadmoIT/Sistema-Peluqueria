/** Lee CSV o Excel y conserva los números originales de las filas para la revisión. */
import "server-only";
import { leerCsv } from "@/lib/clientes-archivo";
import { leerExcel } from "./clientes-excel";
export const LIMITE_FILAS_IMPORTACION = 1_000;
export const LIMITE_ARCHIVO_IMPORTACION = 5 * 1024 * 1024;
export type PrevisualizacionImportacion = {
  encabezados: string[];
  filas: string[][];
  numerosFilas: number[];
  totalFilas: number;
  recortado: boolean;
};
export async function leerArchivoClientes(
  archivo: File,
): Promise<PrevisualizacionImportacion> {
  if (archivo.size > LIMITE_ARCHIVO_IMPORTACION)
    throw new Error("El archivo supera el límite de 5 MB.");
  const extension = archivo.name.split(".").pop()?.toLowerCase();
  const contenido = Buffer.from(await archivo.arrayBuffer());
  async function excelValido() {
    try {
      return await leerExcel(contenido);
    } catch {
      throw new Error(
        "No pudimos leer el Excel. Guardalo nuevamente como .xlsx e intentá otra vez.",
      );
    }
  }
  const matriz =
    extension === "xlsx"
      ? await excelValido()
      : extension === "csv"
        ? leerCsv(contenido.toString("utf8"))
        : null;
  if (!matriz)
    throw new Error("Usá un archivo CSV o Excel con extensión .xlsx.");
  const conDatos = matriz
    .map((fila, i) => ({ fila, numero: i + 1 }))
    .filter(({ fila }) => fila.some((celda) => celda.trim()));
  const primera = conDatos.shift();
  if (!primera?.fila.length)
    throw new Error("El archivo no contiene encabezados.");
  const encabezados = primera.fila.map(
    (valor, i) => valor.trim() || `Columna ${i + 1}`,
  );
  const seleccion = conDatos.slice(0, LIMITE_FILAS_IMPORTACION);
  return {
    encabezados,
    filas: seleccion.map(({ fila }) =>
      encabezados.map((_, i) => String(fila[i] ?? "").trim()),
    ),
    numerosFilas: seleccion.map(({ numero }) => numero),
    totalFilas: conDatos.length,
    recortado: conDatos.length > LIMITE_FILAS_IMPORTACION,
  };
}
