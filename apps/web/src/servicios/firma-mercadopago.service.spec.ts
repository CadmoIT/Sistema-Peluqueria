/** Verifica firmas válidas, alteradas e incompletas de webhooks de Mercado Pago. */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { validarFirmaMercadoPago } from "./firma-mercadopago.service";

describe("firma de Mercado Pago", () => {
  const secreto = "secreto-de-prueba";
  const dataId = "ABC123";
  const requestId = "solicitud-1";
  const ts = "1789099200";
  const firma = createHmac("sha256", secreto)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest("hex");

  it("acepta la firma oficial", () => {
    assert.equal(
      validarFirmaMercadoPago({
        dataId,
        requestId,
        encabezadoFirma: `ts=${ts},v1=${firma}`,
        secreto,
      }),
      true,
    );
  });

  it("rechaza una firma alterada o sin request id", () => {
    assert.equal(
      validarFirmaMercadoPago({
        dataId,
        requestId,
        encabezadoFirma: `ts=${ts},v1=${"0".repeat(64)}`,
        secreto,
      }),
      false,
    );
    assert.equal(
      validarFirmaMercadoPago({
        dataId,
        requestId: null,
        encabezadoFirma: `ts=${ts},v1=${firma}`,
        secreto,
      }),
      false,
    );
  });
});
