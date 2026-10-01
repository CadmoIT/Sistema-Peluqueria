/** Pruebas aisladas de contratación y control de renovación. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "../lib/prisma";
import { ejecutarCheckoutMercadoPago as checkout } from "./checkout-mercadopago";
import { ejecutarRenovacionMercadoPago as renovar } from "./renovacion-mercadopago";

test("contratación y renovación con proveedor aislado", async (t) => {
  const original = { fetch: globalThis.fetch, find: prisma.suscripcion.findUnique, update: prisma.suscripcion.update };
  const claves = ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_TEST_PAYER_EMAIL", "WEB_URL"] as const;
  const env = claves.map((clave) => process.env[clave]);
  const casos = [
    "origen", "sesion", "rol", "plan", "configuracion", "checkout", "reintento", "rechazo", "conexion", "sin-url", "cambio-conexion", "cambio-rechazo",
    "recontratar-vencido", "pausar", "reactivar", "ya-pausada", "cancelada", "referencia", "gratis", "cuerpo", "rechazo-renovacion",
  ];
  try {
    for (const caso of casos) await t.test(caso, async () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "token-ficticio";
      delete process.env.MERCADOPAGO_TEST_PAYER_EMAIL;
      process.env.WEB_URL = "https://example.com";
      const sub = { id: "s1", plan: "PRUEBA", estado: "ACTIVA", negocioId: "n1", proveedorId: null,
        precioMensual: 0, planPendiente: null, precioPendiente: null, checkoutIdempotencia: null, cancelarAlFinal: false,
        proximoCobro: new Date("2030-10-30") } as Record<string, unknown>;
      const esRenovacion = casos.indexOf(caso) >= casos.indexOf("pausar");
      if (caso.startsWith("cambio-")) sub.proveedorId = "mp1";
      if (esRenovacion && caso !== "gratis") Object.assign(sub, { plan: "autogestionado", proveedorId: "mp1" });
      if (caso === "reintento") Object.assign(sub, { planPendiente: "autogestionado", precioPendiente: 9900, checkoutIdempotencia: "clave-persistida" });
      if (caso === "configuracion") delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (caso === "recontratar-vencido") Object.assign(sub, {
        plan: "autogestionado", estado: "CANCELADA", cancelarAlFinal: true, proveedorId: "mp-anterior",
        proximoCobro: new Date(Date.now() - 86_400_000),
      });
      const llamadas: RequestInit[] = [];
      const cambios: Record<string, unknown>[] = [];
      prisma.suscripcion.findUnique = (async () => ({ ...sub })) as unknown as typeof original.find;
      prisma.suscripcion.update = (async ({ data }: { data: Record<string, unknown> }) => {
        cambios.push(data); Object.assign(sub, data); return sub;
      }) as unknown as typeof original.update;
      globalThis.fetch = async (_url, init) => {
        llamadas.push(init ?? {});
        if (caso === "conexion" || caso === "cambio-conexion") throw new Error("Red de prueba caída");
        if (caso === "rechazo" || caso === "cambio-rechazo" || caso === "rechazo-renovacion" && init?.method === "PUT") return Response.json({ message: "Rechazo simulado" }, { status: 400 });
        if (esRenovacion) return Response.json({ id: "mp1", external_reference: caso === "referencia" ? "otro-negocio" : "n1",
          status: init?.method === "PUT" ? JSON.parse(String(init.body)).status : caso === "cancelada" ? "cancelled" : ["reactivar", "ya-pausada"].includes(caso) ? "paused" : "authorized" });
        return Response.json({ id: "mp1", ...(caso === "sin-url" ? {} : { init_point: "https://www.mercadopago.com.ar/checkout" }) });
      };
      const contexto = (async () => caso === "sesion" ? null : { usuario: { email: "cliente@example.com" }, negocio: { id: "n1" }, membresia: { rol: caso === "rol" ? "PROFESIONAL" : "DUENO" } }) as Parameters<typeof checkout>[1];
      const req = new Request(`https://example.com/api?plan=${caso === "plan" ? "inexistente" : "autogestionado"}`, {
        method: "POST", headers: { origin: caso === "origen" ? "https://otro.com" : "https://example.com", "content-type": "application/json" },
        body: JSON.stringify(caso === "cuerpo" ? { activa: "si" } : { activa: caso === "reactivar" || caso === "cancelada" }),
      });
      const resultado = await (esRenovacion ? renovar(req, contexto) : checkout(req, contexto));
      if (["origen", "rol"].includes(caso)) { assert.equal(resultado.status, 403); assert.equal(llamadas.length, 0); }
      else if (caso === "sesion") { assert.match(resultado.headers.get("location")!, /acceder/); assert.equal(llamadas.length, 0); }
      else if (["plan", "configuracion"].includes(caso)) { assert.equal(llamadas.length, 0); assert.equal(cambios.length, 0); }
      else if (["checkout", "reintento", "recontratar-vencido"].includes(caso)) {
        assert.equal(resultado.status, 303); assert.match(resultado.headers.get("location")!, /mercadopago/);
        const cuerpo = JSON.parse(String(llamadas[0]!.body));
        assert.equal(cuerpo.status, "pending"); assert.equal(cuerpo.payer_email, "cliente@example.com");
        assert.equal(cuerpo.auto_recurring.transaction_amount, 9900); assert.equal(cuerpo.external_reference, "n1");
        assert.equal(sub.plan, caso === "recontratar-vencido" ? "autogestionado" : "PRUEBA", "checkout no activa un plan sin pago");
        assert.equal(sub.cancelarAlFinal, false, "una nueva suscripción inicia con renovación habilitada");
        if (caso === "reintento") assert.equal((llamadas[0]!.headers as Record<string, string>)["X-Idempotency-Key"], "clave-persistida");
      } else if (["rechazo", "conexion", "sin-url", "cambio-conexion", "cambio-rechazo"].includes(caso)) {
        assert.match(resultado.headers.get("location")!, /facturacion=error/); assert.equal(sub.proveedorId, caso.startsWith("cambio-") ? "mp1" : null); assert.equal(sub.plan, "PRUEBA");
      } else if (["pausar", "reactivar", "ya-pausada"].includes(caso)) {
        assert.equal(resultado.status, 200); assert.equal(sub.cancelarAlFinal, caso !== "reactivar");
        assert.equal(sub.plan, "autogestionado"); assert.equal((sub.proximoCobro as Date).toISOString(), "2030-10-30T00:00:00.000Z");
        if (caso === "ya-pausada") assert.equal(llamadas.length, 1);
      } else {
        assert.equal(resultado.status, caso === "cuerpo" ? 400 : caso === "rechazo-renovacion" ? 502 : 409);
        assert.equal(cambios.length, 0, "rechazos no cambian la renovación local");
      }
    });
  } finally {
    globalThis.fetch = original.fetch; prisma.suscripcion.findUnique = original.find; prisma.suscripcion.update = original.update;
    claves.forEach((clave, i) => { if (env[i] === undefined) delete process.env[clave]; else process.env[clave] = env[i]; });
  }
});
