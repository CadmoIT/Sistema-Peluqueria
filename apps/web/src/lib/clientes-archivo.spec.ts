/** Comprueba encabezados, CSV y Excel con ejemplos en memoria sin tocar clientes reales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  detectarCampo,
  leerCsv,
  generarCsv,
  validarFilas,
  normalizarDatos,
  coincideCliente,
  type DatosCliente,
} from "./clientes-archivo";
import { generarExcel, leerExcel } from "@/servicios/clientes-excel";
const cliente: DatosCliente = {
  nombre: "María",
  apellido: "Pérez",
  email: "maria@ejemplo.com.ar",
  telefono: "+5400112345678",
};
test("detecta encabezados comunes con tildes, espacios y puntuación sin dividir nombres completos", () => {
  for (const nombre of ["Nombre", " NOMBRES ", "First_Name"])
    assert.equal(detectarCampo(nombre), "nombre");
  for (const email of ["Mail", "E-mail", "Correo Electrónico", "email"])
    assert.equal(detectarCampo(email), "email");
  for (const telefono of [
    "Teléfono",
    "Número",
    "Número de teléfono",
    "TEL",
    "Móvil",
    "Nro. de celular",
  ])
    assert.equal(detectarCampo(telefono), "telefono");
  assert.equal(detectarCampo("Apellido"), "apellido");
  assert.equal(detectarCampo("Nombre Apellido"), "ignorar");
  assert.equal(detectarCampo("Dirección"), "ignorar");
});
test("lee tres separadores, comillas escapadas y celdas con saltos de línea", () => {
  for (const sep of [",", ";", "\t"]) {
    assert.deepEqual(
      leerCsv(
        `\uFEFFNombre${sep}Mail\r\n"María, \"\"M\"\"\nPérez"${sep}maria@ejemplo.com.ar`,
      ),
      [
        ["Nombre", "Mail"],
        ['María, "M"\nPérez', "maria@ejemplo.com.ar"],
      ],
    );
  }
  assert.deepEqual(
    leerCsv("\n\nNombre;Mail\nAna;ana@ejemplo.com.ar").slice(2),
    [
      ["Nombre", "Mail"],
      ["Ana", "ana@ejemplo.com.ar"],
    ],
  );
  assert.throws(() => leerCsv('Nombre,Mail\n"Ana,mail'), /comillas sin cerrar/);
});
test("normaliza contactos, informa errores por fila y detecta duplicados por ambos contactos", () => {
  const resultado = validarFilas([
    {
      fila: 3,
      nombre: "Ana",
      email: " ANA@EJEMPLO.COM.AR ",
      telefono: "11 12345678",
    },
    { fila: 4, email: "ana@ejemplo.com.ar" },
    { fila: 5, email: "otra@ejemplo.com.ar", telefono: "1112345678" },
    { fila: 6, email: "invalido" },
    { fila: 7, telefono: "123" },
    {},
  ]);
  assert.equal(resultado.filas.length, 1);
  assert.equal(resultado.filas[0]!.email, "ana@ejemplo.com.ar");
  assert.equal(resultado.errores.length, 5);
  assert.equal(resultado.errores[0]!.fila, 4);
  assert.equal(
    normalizarDatos({ telefono: 1112345678 }).telefono,
    "1112345678",
  );
  assert.equal(coincideCliente(cliente, "maria perez"), true);
});
test("CSV exporta datos, protege fórmulas y conserva los contactos al reimportarlos", () => {
  const texto = generarCsv([{ ...cliente, nombre: '=HYPERLINK("malicioso")' }]);
  assert.ok(texto.startsWith("\uFEFF"));
  const filas = leerCsv(texto);
  assert.equal(filas[1]![0], '\'=HYPERLINK("malicioso")');
  assert.equal(
    normalizarDatos({ telefono: filas[1]![3] }).telefono,
    cliente.telefono,
  );
  assert.equal(leerCsv(generarCsv([])).length, 1);
});
test("Excel exporta teléfonos y fórmulas aparentes como texto y permite importar la misma información", async () => {
  const datos = [{ ...cliente, nombre: "=1+1", telefono: "001112345678" }];
  const contenido = await generarExcel(datos);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(
    Buffer.from(contenido) as unknown as Parameters<typeof libro.xlsx.load>[0],
  );
  assert.equal(libro.worksheets[0]!.getCell("D2").value, "001112345678");
  assert.equal(libro.worksheets[0]!.getCell("D2").numFmt, "@");
  assert.equal(libro.worksheets[0]!.getCell("A2").value, "=1+1");
  const filas = await leerExcel(Buffer.from(contenido));
  assert.deepEqual(filas[1], ["=1+1", "Pérez", cliente.email, "001112345678"]);
});
