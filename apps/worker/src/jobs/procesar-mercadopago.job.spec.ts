/** Comprueba la conversión de estados canónicos de pago de Mercado Pago. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapearEstadoPago } from "./procesar-mercadopago.job.js";
import { procesarEventosMercadoPago } from "./procesar-mercadopago.job.js";
import { prisma } from "../lib/prisma.js";

it("dos eventos de factura para el mismo pago conservan un único pago", async () => {
  const originales = {
    token: process.env.MERCADOPAGO_ACCESS_TOKEN, fetch: globalThis.fetch,
    query: prisma.$queryRaw, transaction: prisma.$transaction,
    eventoUpdate: prisma.eventoExterno.update,
    eventoUpdateMany: prisma.eventoExterno.updateMany,
    suscripcionFind: prisma.suscripcion.findUnique,
    suscripcionUpdateMany: prisma.suscripcion.updateMany,
  };
  const pagos = new Map<string, unknown>();
  const suscripcion = { id: "s1", negocioId: "n1", plan: "PRUEBA", planPendiente: "plus", precioPendiente: 9900, precioMensual: 0, estado: "ACTIVA" };
  let lote = 0;
  process.env.MERCADOPAGO_ACCESS_TOKEN = "token-de-prueba";
  prisma.$queryRaw = (async () => [{ id: `e${++lote}`, tipo: "subscription_authorized_payment", recursoId: "f1", contenido: {}, intentos: 1 }]) as unknown as typeof prisma.$queryRaw;
  prisma.eventoExterno.updateMany = (async () => ({ count: 0 })) as typeof prisma.eventoExterno.updateMany;
  prisma.eventoExterno.update = (async () => ({})) as unknown as typeof prisma.eventoExterno.update;
  prisma.suscripcion.updateMany = (async () => ({ count: 0 })) as typeof prisma.suscripcion.updateMany;
  prisma.suscripcion.findUnique = (async () => suscripcion) as unknown as typeof prisma.suscripcion.findUnique;
  prisma.$transaction = (async (fn: (tx: unknown) => Promise<void>) => fn({
    pago: { upsert: async ({ where, create, update }: { where: { proveedorId: string }; create: unknown; update: unknown }) => {
      pagos.set(where.proveedorId, pagos.has(where.proveedorId) ? update : create);
    } },
    suscripcion: {
      update: async ({ data }: { data: object }) => Object.assign(suscripcion, data),
      updateMany: async ({ data }: { data: object }) => {
        if (!("primerPagoEn" in suscripcion)) Object.assign(suscripcion, data);
        return { count: 1 };
      },
    },
    auditoria: { create: async () => ({}) },
  })) as unknown as typeof prisma.$transaction;
  globalThis.fetch = async (url) => Response.json(String(url).includes("authorized_payments")
    ? { id: "f1", preapproval_id: "s1", payment: { id: 123 } }
    : { id: 123, status: "approved", currency_id: "ARS", transaction_amount: 9900 });
  try {
    await procesarEventosMercadoPago([]);
    await procesarEventosMercadoPago([]);
    assert.equal(pagos.size, 1);
    assert.equal(suscripcion.plan, "plus");
    assert.equal(suscripcion.planPendiente, null);
    assert.equal("proximoCobro" in suscripcion, false, "repetir el pago no extiende el período");
  } finally {
    globalThis.fetch = originales.fetch;
    prisma.$queryRaw = originales.query;
    prisma.$transaction = originales.transaction;
    prisma.eventoExterno.update = originales.eventoUpdate;
    prisma.eventoExterno.updateMany = originales.eventoUpdateMany;
    prisma.suscripcion.findUnique = originales.suscripcionFind;
    prisma.suscripcion.updateMany = originales.suscripcionUpdateMany;
    if (originales.token === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    else process.env.MERCADOPAGO_ACCESS_TOKEN = originales.token;
  }
});

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
