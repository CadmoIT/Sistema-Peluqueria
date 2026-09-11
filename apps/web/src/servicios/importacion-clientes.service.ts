/** Lee archivos de clientes y normaliza sus celdas sin ejecutar fórmulas del documento. */
import "server-only";

import ExcelJS from "exceljs";

export const LIMITE_FILAS_IMPORTACION = 1_000;
export const LIMITE_ARCHIVO_IMPORTACION = 5 * 1024 * 1024;

export type PrevisualizacionImportacion = {
  encabezados: string[];
  filas: string[][];
  totalFilas: number;
  recortado: boolean;
};

export async function leerArchivoClientes(
  archivo: File,
): Promise<PrevisualizacionImportacion> {
  if (archivo.size > LIMITE_ARCHIVO_IMPORTACION) {
    throw new Error("El archivo supera el límite de 5 MB.");
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase();
  const contenido = Buffer.from(await archivo.arrayBuffer());
  const matriz =
    extension === "xlsx"
      ? await leerExcel(contenido)
      : extension === "csv"
        ? leerCsv(contenido.toString("utf8"))
        : null;

  if (!matriz) {
    throw new Error("Usá un archivo CSV o Excel con extensión .xlsx.");
  }

  const filasConContenido = matriz.filter((fila) =>
    fila.some((celda) => celda.trim()),
  );
  const primeraFila = filasConContenido.shift();

  if (!primeraFila?.length) {
    throw new Error("El archivo no contiene encabezados.");
  }

  const encabezados = primeraFila.map(
    (encabezado, indice) => encabezado.trim() || `Columna ${indice + 1}`,
  );
  const totalFilas = filasConContenido.length;
  const filas = filasConContenido
    .slice(0, LIMITE_FILAS_IMPORTACION)
    .map((fila) =>
      encabezados.map((_, indice) => String(fila[indice] ?? "").trim()),
    );

  return {
    encabezados,
    filas,
    totalFilas,
    recortado: totalFilas > LIMITE_FILAS_IMPORTACION,
  };
}

async function leerExcel(contenido: Buffer) {
  const libro = new ExcelJS.Workbook();
  // ExcelJS aún declara el Buffer previo a los genéricos de Node 22.
  const bufferCompatible = contenido as unknown as Parameters<
    typeof libro.xlsx.load
  >[0];
  await libro.xlsx.load(bufferCompatible);
  const hoja = libro.worksheets[0];

  if (!hoja) return [];

  const matriz: string[][] = [];
  hoja.eachRow({ includeEmpty: false }, (fila) => {
    const valores: string[] = [];
    for (let columna = 1; columna <= fila.cellCount; columna += 1) {
      valores.push(valorCelda(fila.getCell(columna).value));
    }
    matriz.push(valores);
  });
  return matriz;
}

function valorCelda(valor: ExcelJS.CellValue) {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor !== "object") return String(valor);
  if ("result" in valor)
    return valor.result == null ? "" : String(valor.result);
  if ("text" in valor) return String(valor.text);
  if ("richText" in valor) {
    return valor.richText.map((fragmento) => fragmento.text).join("");
  }
  return "";
}

function leerCsv(contenido: string) {
  const matriz: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;

  for (let indice = 0; indice < contenido.length; indice += 1) {
    const caracter = contenido[indice];
    const siguiente = contenido[indice + 1];

    if (caracter === '"' && entreComillas && siguiente === '"') {
      celda += '"';
      indice += 1;
    } else if (caracter === '"') {
      entreComillas = !entreComillas;
    } else if (caracter === "," && !entreComillas) {
      fila.push(celda);
      celda = "";
    } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
      if (caracter === "\r" && siguiente === "\n") indice += 1;
      fila.push(celda);
      matriz.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += caracter;
    }
  }

  if (celda || fila.length) {
    fila.push(celda);
    matriz.push(fila);
  }

  if (matriz[0]?.[0]) matriz[0][0] = matriz[0][0].replace(/^\uFEFF/, "");
  return matriz;
}
