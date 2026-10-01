/** Comprueba que abrir el checkout no se confunda con haber realizado un pago. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hayPagoEnVerificacion } from "./pago-en-verificacion";

const suscripcion = { id: "suscripcion", planPendiente: "autogestionado" };
const pago = { suscripcionId: "suscripcion", proveedorId: "pago-mp", plan: "autogestionado", estado: "EN_PROCESO" };

test("volver atrás sin pagar no muestra verificación", () => {
  assert.equal(hayPagoEnVerificacion(suscripcion, []), false);
  assert.equal(hayPagoEnVerificacion(suscripcion, [{ ...pago, proveedorId: null }]), false);
});

test("una operación registrada permite verificar hasta que se active el plan", () => {
  for (const estado of ["PENDIENTE", "EN_PROCESO", "APROBADO"]) {
    assert.equal(hayPagoEnVerificacion(suscripcion, [{ ...pago, estado }]), true);
  }
  assert.equal(hayPagoEnVerificacion({ ...suscripcion, planPendiente: null }, [pago]), false);
});

test("no confunde otros planes, suscripciones ni pagos rechazados con la contratación", () => {
  assert.equal(hayPagoEnVerificacion(null, [pago]), false);
  for (const cambio of [{ plan: "pro" }, { suscripcionId: "otra" }, { estado: "RECHAZADO" }, { estado: "ANULADO" }, { estado: "REEMBOLSADO" }]) {
    assert.equal(hayPagoEnVerificacion(suscripcion, [{ ...pago, ...cambio }]), false);
  }
});
