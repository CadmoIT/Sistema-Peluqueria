/** Ejercita el receptor real sin conectarse a PostgreSQL ni a Mercado Pago. */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { POST } from "../app/webhooks/mercadopago/route";

test("dos entregas firmadas del mismo evento dejan una sola entrada durable", async () => {
  const secretoAnterior = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const crearAnterior = prisma.eventoExterno.create;
  const entradas = new Set<string>();
  const secreto = "secreto-exclusivo-de-prueba";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = secreto;
  prisma.eventoExterno.create = (async ({ data }: { data: { eventoId: string } }) => {
    if (entradas.has(data.eventoId)) {
      throw new Prisma.PrismaClientKnownRequestError("Duplicado", { code: "P2002", clientVersion: "6.19.3" });
    }
    entradas.add(data.eventoId);
    return {};
  }) as unknown as typeof crearAnterior;
  const solicitar = (requestId: string, valida = true) => {
    const firma = createHmac("sha256", valida ? secreto : "otro-secreto")
      .update(`id:7032400749;request-id:${requestId};ts:1704908010;`).digest("hex");
    return new Request("https://example.com/webhooks/mercadopago?data.id=7032400749", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=1704908010,v1=${firma}` },
      body: JSON.stringify({ id: "evento-unico", type: "subscription_authorized_payment", data: { id: "7032400749" } }),
    });
  };
  try {
    const primera = await POST(solicitar("entrega-1"));
    const segunda = await POST(solicitar("entrega-2"));
    assert.equal(primera.status, 200);
    assert.deepEqual(await primera.json(), { recibido: true });
    assert.equal(segunda.status, 200);
    assert.deepEqual(await segunda.json(), { recibido: true, duplicado: true });
    assert.equal(entradas.size, 1);
    const concurrentes = await Promise.all([POST(solicitar("entrega-3")), POST(solicitar("entrega-4"))]);
    for (const respuesta of concurrentes) {
      assert.equal(respuesta.status, 200);
      assert.deepEqual(await respuesta.json(), { recibido: true, duplicado: true });
    }
    assert.equal(entradas.size, 1);
    const invalida = await POST(solicitar("firma-invalida", false));
    assert.equal(invalida.status, 401);
    assert.equal(entradas.size, 1);
    const sinFirma = await POST(new Request("https://example.com/webhooks/mercadopago", {
      method: "POST", body: JSON.stringify({ data: { id: "7032400749" } }),
    }));
    assert.equal(sinFirma.status, 401);
    const malformada = await POST(new Request("https://example.com/webhooks/mercadopago", { method: "POST", body: "{" }));
    assert.equal(malformada.status, 400);
    prisma.eventoExterno.create = (async () => { throw new Error("Base de prueba indisponible"); }) as unknown as typeof crearAnterior;
    assert.equal((await POST(solicitar("base-caida"))).status, 503, "no confirma recepción si no pudo persistir");
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    assert.equal((await POST(solicitar("sin-secreto"))).status, 503);
  } finally {
    prisma.eventoExterno.create = crearAnterior;
    if (secretoAnterior === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    else process.env.MERCADOPAGO_WEBHOOK_SECRET = secretoAnterior;
  }
});
