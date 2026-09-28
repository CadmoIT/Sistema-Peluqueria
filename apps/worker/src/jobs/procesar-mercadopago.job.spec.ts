/** Comprueba la conversión de estados canónicos de pago de Mercado Pago. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapearEstadoPago } from "./procesar-mercadopago.job.js";

describe("estados de pagos recurrentes de Mercado Pago", () => {
  it("conserva los estados aprobados y pendientes", () => {
    assert.equal(mapearEstadoPago("approved"), "APROBADO");
    assert.equal(mapearEstadoPago("pending"), "PENDIENTE");
    assert.equal(mapearEstadoPago("in_process"), "EN_PROCESO");
  });

  it("distingue rechazos, reembolsos y contracargos", () => {
    assert.equal(mapearEstadoPago("rejected"), "RECHAZADO");
    assert.equal(mapearEstadoPago("refunded"), "REEMBOLSADO");
    assert.equal(
      mapearEstadoPago("refunded", "partially_refunded"),
      "REEMBOLSADO_PARCIAL",
    );
    assert.equal(mapearEstadoPago("charged_back"), "CONTRACARGO");
    assert.equal(mapearEstadoPago("cancelled"), "ANULADO");
  });

  it("no inventa una equivalencia para estados desconocidos", () => {
    assert.throws(() => mapearEstadoPago("unknown"), /no reconocido/);
  });
});
