/** Valida autoría, vencimiento e idempotencia de la reversión inmediata. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarDeshacerVenta } from "./deshacer-venta";
test("permite deshacer hasta el plazo, nunca ventas ajenas ni históricas", () => {
  const v = {
    actorUsuarioId: "yo",
    anuladoEn: null,
    deshacerHasta: new Date(15000),
  };
  assert.equal(validarDeshacerVenta(v, "yo", 14999), true);
  assert.equal(validarDeshacerVenta(v, "yo", 15000), true);
  assert.throws(() => validarDeshacerVenta(v, "yo", 15001));
  assert.throws(() => validarDeshacerVenta(v, "otro", 1000));
  assert.throws(() =>
    validarDeshacerVenta({ ...v, deshacerHasta: null }, "yo", 1000),
  );
  assert.throws(() => validarDeshacerVenta(null, "yo", 1000));
});
test("una venta ya deshecha no se revierte dos veces, y sigue validando actor", () => {
  const v = {
    actorUsuarioId: "yo",
    anuladoEn: new Date(1000),
    deshacerHasta: new Date(15000),
  };
  assert.equal(validarDeshacerVenta(v, "yo", 20000), false);
  assert.throws(() => validarDeshacerVenta(v, "otro", 1000));
});
