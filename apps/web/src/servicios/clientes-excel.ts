/** Lee y escribe celdas de clientes como texto sin ejecutar fórmulas de Excel. */
import ExcelJS from "exceljs";
import { CAMPOS_CLIENTE, type DatosCliente } from "@/lib/clientes-archivo";
export async function leerExcel(contenido: Buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(
    contenido as unknown as Parameters<typeof libro.xlsx.load>[0],
  );
  const matriz: string[][] = [];
  libro.worksheets[0]?.eachRow({ includeEmpty: true }, (fila) => {
    const valores: string[] = [];
    for (let c = 1; c <= fila.cellCount; c++) {
      const valor = fila.getCell(c).value;
      if (valor == null) valores.push("");
      else if (typeof valor !== "object") valores.push(String(valor));
      else if (valor instanceof Date) valores.push(valor.toISOString());
      else if ("result" in valor)
        valores.push(valor.result == null ? "" : String(valor.result));
      else if ("text" in valor) valores.push(valor.text);
      else if ("richText" in valor)
        valores.push(valor.richText.map((parte) => parte.text).join(""));
      else valores.push("");
    }
    matriz.push(valores);
  });
  return matriz;
}
export async function generarExcel(clientes: DatosCliente[]) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Clientes");
  hoja.columns = CAMPOS_CLIENTE.map((key, i) => ({
    key,
    header: ["Nombre", "Apellido", "Email", "Teléfono"][i],
    width: i === 2 ? 35 : 24,
    style: { numFmt: "@" },
  }));
  hoja.getRow(1).font = { bold: true };
  clientes.forEach((cliente) =>
    hoja.addRow(CAMPOS_CLIENTE.map((campo) => cliente[campo] ?? "")),
  );
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  return new Uint8Array(await libro.xlsx.writeBuffer());
}
