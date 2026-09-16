/** Rechaza carritos inválidos y normaliza su orden para confirmar sin duplicados. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarItems } from "./ventas-operaciones.service";
test("acepta artículos enteros y normaliza el orden", () => {
  assert.deepEqual(validarItems([{ id: "b", tipo: "servicio", cantidad: 2 }, { id: "a", tipo: "producto", cantidad: 1 }]), [{ id: "a", tipo: "producto", cantidad: 1 }, { id: "b", tipo: "servicio", cantidad: 2 }]);
});
test("no filtra silenciosamente filas inválidas, repetidas o cantidades fraccionarias", () => {
  for (const items of [[], [{ id: "a", tipo: "producto", cantidad: 1.5 }], [{ id: "a", tipo: "producto", cantidad: 101 }], [{ id: "a", tipo: "producto", cantidad: 1 }, { id: "a", tipo: "producto", cantidad: 1 }], [null], [{}]]) assert.throws(() => validarItems(items));
});
