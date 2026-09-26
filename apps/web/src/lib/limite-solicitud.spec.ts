/** Comprueba el límite previo de lectura para cuerpos HTTP grandes o inválidos. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { superaLimiteDeclarado } from "./limite-solicitud";

function solicitud(largo?: string) {
  return { headers: new Headers(largo ? { "content-length": largo } : {}) };
}

test("acepta tamaños dentro del máximo o sin longitud declarada", () => {
  assert.equal(superaLimiteDeclarado(solicitud("1024"), 1024), false);
  assert.equal(superaLimiteDeclarado(solicitud(), 1024), false);
});

test("rechaza cuerpos sobredimensionados y longitudes malformadas", () => {
  assert.equal(superaLimiteDeclarado(solicitud("1025"), 1024), true);
  assert.equal(superaLimiteDeclarado(solicitud("no-es-un-numero"), 1024), true);
});
