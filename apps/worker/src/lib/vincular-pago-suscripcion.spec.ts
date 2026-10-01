/** Verifica la correspondencia entre pago, factura y suscripción. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { vincularPagoSuscripcion } from "./vincular-pago-suscripcion.js";

test("recupera la relación ausente en el pago desde la factura", () => {
  assert.deepEqual(vincularPagoSuscripcion({ id: 123, status: "approved" }, {
    preapproval_id: "suscripcion", payment: { id: "123" },
  }), { id: 123, status: "approved", preapproval_id: "suscripcion" });
});
test("acepta una relación consistente sin modificar el pago original", () => {
  const pago = { id: "123", preapproval_id: "suscripcion" };
  assert.deepEqual(vincularPagoSuscripcion(pago, { preapproval_id: "suscripcion", payment: { id: 123 } }), pago);
});
test("rechaza un pago diferente al de la factura", () => {
  assert.throws(() => vincularPagoSuscripcion({ id: 124 }, { preapproval_id: "suscripcion", payment: { id: 123 } }));
});
test("rechaza suscripciones contradictorias", () => {
  assert.throws(() => vincularPagoSuscripcion({ id: 123, preapproval_id: "otra" }, { preapproval_id: "suscripcion", payment: { id: 123 } }));
});
test("no inventa una relación si falta información de la factura", () => {
  assert.throws(() => vincularPagoSuscripcion({ id: 123 }, { payment: { id: 123 } }));
  assert.throws(() => vincularPagoSuscripcion({ id: 123 }, { preapproval_id: "suscripcion" }));
});
