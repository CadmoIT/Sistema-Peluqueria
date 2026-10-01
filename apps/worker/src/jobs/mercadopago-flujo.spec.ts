import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "../lib/prisma.js";
import { MAX_INTENTOS_ENTREGA, proximoIntento } from "../lib/reintentos.js";
import { procesarEventosMercadoPago } from "./procesar-mercadopago.job.js";

test("bandeja, pagos y ciclo de vida con proveedor y almacenamiento simulados", async (t) => {
  const originales = { fetch: globalThis.fetch, token: process.env.MERCADOPAGO_ACCESS_TOKEN,
    query: prisma.$queryRaw, transaction: prisma.$transaction, event: prisma.eventoExterno.update,
    recover: prisma.eventoExterno.updateMany, find: prisma.suscripcion.findUnique,
    findFirst: prisma.suscripcion.findFirst, update: prisma.suscripcion.update, expire: prisma.suscripcion.updateMany };
  const casos = ["aprobado", "pendiente", "rechazado", "reembolso", "parcial", "contracargo", "anulado", "moneda", "importe", "desconocida", "sin-pago", "relacion", "red", "401", "429", "500", "agotado", "reinicio", "pausada", "autorizada", "preapproval-pendiente", "referencia", "precio", "vencida", "futura", "topico", "sin-token", "reintento-exitoso"];
  try {
    for (const caso of casos) await t.test(caso, async () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "token-ficticio";
      if (caso === "sin-token") delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const ahora = new Date();
      const sub: Record<string, unknown> = { id: "s1", negocioId: "n1", proveedorId: "mp1", plan: "PRUEBA", planPendiente: "autogestionado",
        precioPendiente: 9900, precioMensual: 9900, estado: "ACTIVA", cancelarAlFinal: ["vencida", "futura"].includes(caso),
        proximoCobro: new Date(ahora.getTime() + (caso === "vencida" ? -60_000 : 86_400_000)) };
      const preapproval = ["pausada", "autorizada", "preapproval-pendiente", "referencia", "precio"].includes(caso);
      const evento: Record<string, unknown> = { id: "e1", tipo: preapproval ? "subscription_preapproval" : caso === "topico" ? "otro" : "subscription_authorized_payment",
        recursoId: "f1", contenido: {}, intentos: caso === "agotado" ? MAX_INTENTOS_ENTREGA : 1 };
      const cambiosEvento: Record<string, unknown>[] = [];
      const pagos = new Map<string, unknown>();
      let consultar = 0;
      let sql = "";
      let parametros: unknown[] = [];
      let recuperacion: unknown;
      prisma.$queryRaw = (async (partes: TemplateStringsArray, ...valores: unknown[]) => {
        sql = partes.join("?"); parametros = valores;
        return [evento];
      }) as unknown as typeof prisma.$queryRaw;
      prisma.eventoExterno.updateMany = (async (args: unknown) => { recuperacion = args; return { count: 0 }; }) as typeof prisma.eventoExterno.updateMany;
      prisma.eventoExterno.update = (async ({ data }: { data: Record<string, unknown> }) => { cambiosEvento.push(data); return {}; }) as unknown as typeof prisma.eventoExterno.update;
      prisma.suscripcion.findUnique = (async () => caso === "desconocida" ? null : sub) as unknown as typeof prisma.suscripcion.findUnique;
      prisma.suscripcion.findFirst = (async () => sub) as unknown as typeof prisma.suscripcion.findFirst;
      prisma.suscripcion.update = (async ({ data }: { data: object }) => Object.assign(sub, data)) as unknown as typeof prisma.suscripcion.update;
      prisma.suscripcion.updateMany = (async ({ where, data }: { where: { proximoCobro: { lte: Date } }; data: object }) => {
        if (sub.cancelarAlFinal && sub.estado === "ACTIVA" && (sub.proximoCobro as Date) <= where.proximoCobro.lte) Object.assign(sub, data);
        return { count: 0 };
      }) as unknown as typeof prisma.suscripcion.updateMany;
      prisma.$transaction = (async (fn: (tx: unknown) => Promise<void>) => fn({
        pago: { upsert: async ({ where, create }: { where: { proveedorId: string }; create: unknown }) => pagos.set(where.proveedorId, create) },
        suscripcion: { update: async ({ data }: { data: object }) => Object.assign(sub, data) },
        auditoria: { create: async () => ({}) },
      })) as unknown as typeof prisma.$transaction;
      globalThis.fetch = async (url) => {
        consultar++;
        if (caso === "red" || caso === "agotado" || caso === "reintento-exitoso" && consultar === 1) throw new Error("Red caída simulada");
        if (["401", "429", "500"].includes(caso)) return Response.json({}, { status: Number(caso) });
        if (String(url).includes("/preapproval/")) return Response.json({ id: "mp1", external_reference: caso === "referencia" ? "otro" : "n1",
          status: caso === "pausada" ? "paused" : caso === "preapproval-pendiente" ? "pending" : "authorized",
          auto_recurring: { currency_id: "ARS", transaction_amount: caso === "precio" ? 1 : 9900 } });
        if (String(url).includes("authorized_payments")) return Response.json({ id: "f1", preapproval_id: "mp1", payment: caso === "sin-pago" ? {} : { id: 123 } });
        const estados: Record<string, string> = { pendiente: "pending", rechazado: "rejected", reembolso: "refunded", parcial: "refunded", contracargo: "charged_back", anulado: "cancelled" };
        return Response.json({ id: 123, status: estados[caso] ?? "approved", status_detail: caso === "parcial" ? "partially_refunded" : null,
          ...(caso === "relacion" ? { preapproval_id: "otra" } : {}), currency_id: caso === "moneda" ? "USD" : "ARS", transaction_amount: caso === "importe" ? 1 : 9900 });
      };
      if (["vencida", "futura", "topico"].includes(caso)) evento.tipo = "otro";
      await procesarEventosMercadoPago([]);
      if (caso === "sin-token") { assert.equal(consultar, 0); assert.equal(sql, ""); return; }
      assert.match(sql, /FOR UPDATE SKIP LOCKED/);
      assert.match(sql, /proximoIntentoEn.*<= NOW/);
      assert.match(sql, /reclamadoEn.*INTERVAL '1 minute'/);
      assert.deepEqual(parametros, [10, 20]);
      assert.deepEqual(recuperacion, { where: { proveedor: "MERCADO_PAGO", tipo: "subscription_authorized_payment", estado: "FALLIDO", error: "El pago no está vinculado a una suscripción identificable." },
        data: { estado: "RECIBIDO", intentos: 0, error: null, proximoIntentoEn: null, reclamadoEn: null } });
      const fallos = ["moneda", "importe", "desconocida", "sin-pago", "relacion", "red", "401", "429", "500", "agotado", "referencia", "precio", "reintento-exitoso"];
      if (fallos.includes(caso)) {
        const cambio = cambiosEvento.at(-1)!;
        assert.equal(cambio.estado, caso === "agotado" ? "FALLIDO" : "RECIBIDO");
        assert.equal(cambio.reclamadoEn, null);
        assert.equal(cambio.proximoIntentoEn instanceof Date, caso !== "agotado");
        assert.equal(pagos.size, 0); assert.equal(sub.plan, "PRUEBA");
        if (caso === "reintento-exitoso") {
          evento.intentos = 2;
          await procesarEventosMercadoPago([]);
          assert.equal(cambiosEvento.at(-1)!.estado, "PROCESADO"); assert.equal(sub.plan, "autogestionado");
        }
      } else {
        assert.equal(cambiosEvento.at(-1)!.estado, "PROCESADO");
        if (["aprobado", "reinicio"].includes(caso)) { assert.equal(sub.plan, "autogestionado"); assert.equal(sub.planPendiente, null); assert.equal(pagos.size, 1); }
        else assert.equal(sub.plan, "PRUEBA", "otros estados no activan el plan pendiente");
        if (caso === "rechazado") { assert.equal(sub.estado, "EN_GRACIA"); assert.ok((sub.graciaHasta as Date) > ahora); }
        if (["reembolso", "contracargo"].includes(caso)) assert.equal(sub.estado, "PAUSADA");
        if (caso === "parcial") assert.equal(sub.estado, "ACTIVA");
        if (caso === "pausada") { assert.equal(sub.cancelarAlFinal, true); assert.equal(sub.estado, "ACTIVA"); }
        if (caso === "vencida") { assert.equal(sub.estado, "CANCELADA"); assert.equal(sub.planPendiente, null); }
        if (caso === "futura") assert.equal(sub.estado, "ACTIVA");
      }
    });
  } finally {
    globalThis.fetch = originales.fetch; prisma.$queryRaw = originales.query; prisma.$transaction = originales.transaction;
    prisma.eventoExterno.update = originales.event; prisma.eventoExterno.updateMany = originales.recover;
    prisma.suscripcion.findUnique = originales.find; prisma.suscripcion.findFirst = originales.findFirst;
    prisma.suscripcion.update = originales.update; prisma.suscripcion.updateMany = originales.expire;
    if (originales.token === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN; else process.env.MERCADOPAGO_ACCESS_TOKEN = originales.token;
  }
});

test("el sondeo rápido respeta el backoff y el máximo de intentos", () => {
  const ahora = new Date("2030-01-01T00:00:00Z");
  assert.equal(proximoIntento(1, ahora)!.getTime() - ahora.getTime(), 60_000);
  assert.equal(proximoIntento(2, ahora)!.getTime() - ahora.getTime(), 300_000);
  assert.equal(proximoIntento(MAX_INTENTOS_ENTREGA, ahora), null);
});
