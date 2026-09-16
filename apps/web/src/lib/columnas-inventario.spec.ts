/** Comprueba columnas obligatorias y valores libres sin alterar campos financieros. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverColumnas, valorColumna } from "./columnas-inventario";
test("la tabla comienza sencilla y oculta Local cuando no aporta elección", () => {
  assert.deepEqual(resolverColumnas(null, [], false), ["nombre", "precio", "cantidad", "acciones"]);
  assert.deepEqual(resolverColumnas(null, [], true), ["nombre", "precio", "cantidad", "local", "acciones"]);
});
test("preserva el orden y las columnas obligatorias sin aceptar identificadores ajenos", () => {
  const libres = [{ id: "propia", nombre: "Fecha", tipo: "FECHA" as const, orden: 0 }];
  assert.deepEqual(resolverColumnas({ columnasInventario: ["sku", "propia", "sku", "ajena"] }, libres, false), ["sku", "propia", "nombre", "cantidad", "acciones"]);
});
test("valida Texto, Número y Fecha y permite vaciar sin inventar valores", () => {
  assert.equal(valorColumna("TEXTO", "  Ana  "), "Ana"); assert.equal(valorColumna("NUMERO", "1.25"), 1.25); assert.equal(valorColumna("FECHA", "2028-02-29"), "2028-02-29");
  assert.equal(valorColumna("NUMERO", " "), null); assert.throws(() => valorColumna("NUMERO", "NaN")); assert.throws(() => valorColumna("FECHA", "2026-02-30")); assert.throws(() => valorColumna("TEXTO", "x".repeat(501)));
});
