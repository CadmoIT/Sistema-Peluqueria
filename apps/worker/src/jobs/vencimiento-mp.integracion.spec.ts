/** Usa únicamente un esquema PostgreSQL local reservado para esta prueba. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const habilitada = process.env.PRUEBAS_VENCIMIENTO_MP === "1";
test("vencimiento real en PostgreSQL conserva el período futuro y bloquea reservas del vencido", { skip: !habilitada }, async () => {
  const conexion = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(conexion.hostname), "Nunca ejecutar contra Railway o una base remota.");
  assert.match(conexion.searchParams.get("schema") ?? "", /^mp_vencimiento_prueba_[a-z0-9_]+$/);
  assert.notEqual(process.env.NODE_ENV, "production");
  const { prisma } = await import("../lib/prisma.js");
  const { procesarEventosMercadoPago } = await import("./procesar-mercadopago.job.js");
  const rutaWeb = pathToFileURL(resolve(__dirname, "../../../web/src/app/api/reservas-publicas/disponibilidad/route.ts")).href;
  const { GET } = await import(rutaWeb);
  const rutaPrismaWeb = pathToFileURL(resolve(__dirname, "../../../web/src/lib/prisma.ts")).href;
  const { prisma: prismaWeb } = await import(rutaPrismaWeb);
  const tokenAnterior = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const fetchAnterior = globalThis.fetch;
  const ids: string[] = [];
  const marca = `prueba-vencimiento-mp-${randomUUID()}`;
  let llamadasProveedor = 0;
  try {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token-no-utilizable-solo-prueba";
    globalThis.fetch = async () => { llamadasProveedor++; throw new Error("Esta prueba no permite llamadas externas"); };
    for (const [nombre, dias] of [["vencida", -1], ["futura", 1]] as const) {
      const negocio = await prisma.negocio.create({ data: {
        nombre: `Prueba aislada ${nombre}`, slug: `${marca}-${nombre}`, publicado: true,
        suscripcion: { create: {
          plan: "autogestionado", estado: "ACTIVA", precioMensual: 9900,
          cancelarAlFinal: true, proximoCobro: new Date(Date.now() + dias * 86_400_000),
        } },
      } });
      ids.push(negocio.id);
    }
    await procesarEventosMercadoPago([]);
    const vencida = await prisma.suscripcion.findUniqueOrThrow({ where: { negocioId: ids[0]! } });
    const futura = await prisma.suscripcion.findUniqueOrThrow({ where: { negocioId: ids[1]! } });
    assert.equal(vencida.estado, "CANCELADA");
    assert.equal(futura.estado, "ACTIVA");
    assert.equal(futura.cancelarAlFinal, true);
    assert.equal(await prisma.pago.count({ where: { negocioId: { in: ids } } }), 0);
    const fecha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const respuesta = await GET(new Request(`https://example.com/api/reservas-publicas/disponibilidad?slug=${marca}-vencida&servicioId=ficticio&sedeId=ficticia&profesionalId=ficticio&fecha=${fecha}`));
    assert.equal(respuesta.status, 404, "el servidor no permite consultar reservas del sitio vencido");
    assert.deepEqual(await respuesta.json(), { mensaje: "El sitio no está disponible." });
    assert.equal(llamadasProveedor, 0);
  } finally {
    globalThis.fetch = fetchAnterior;
    if (tokenAnterior === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    else process.env.MERCADOPAGO_ACCESS_TOKEN = tokenAnterior;
    // Borrar únicamente los registros creados por esta ejecución y su marca.
    await prisma.negocio.deleteMany({ where: { id: { in: ids }, slug: { startsWith: marca } } });
    await prisma.$disconnect(); await prismaWeb.$disconnect();
  }
});

test("retiro real a los 37 días y recuperación Plus conservan dirección, diseño y clientes", { skip: !habilitada }, async () => {
  const conexion = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(conexion.hostname));
  assert.match(conexion.searchParams.get("schema") ?? "", /^mp_vencimiento_prueba_[a-z0-9_]+$/);
  assert.notEqual(process.env.NODE_ENV, "production");
  const { prisma } = await import("../lib/prisma.js");
  const { retirarSitiosSinPlan } = await import("./retirar-sitios.job.js");
  const rutaServicio = pathToFileURL(resolve(__dirname, "../../../web/src/servicios/recuperar-sitio.service.ts")).href;
  const { restaurarSitioRetirado } = await import(rutaServicio);
  const rutaWeb = pathToFileURL(resolve(__dirname, "../../../web/src/app/api/reservas-publicas/disponibilidad/route.ts")).href;
  const { GET } = await import(rutaWeb);
  const rutaPrismaWeb = pathToFileURL(resolve(__dirname, "../../../web/src/lib/prisma.ts")).href;
  const { prisma: prismaWeb } = await import(rutaPrismaWeb);
  const marca = `prueba-vencimiento-mp-${randomUUID()}`;
  const ids: string[] = [];
  const fecha = (dias: number) => new Date(Date.now() + dias * 86_400_000);
  const resultados: Record<string, string> = {};
  try {
    for (const caso of ["retirable", "menos-de-30", "prueba", "pago-previo", "historial", "activa"]) {
      const negocio = await prisma.negocio.create({ data: {
        nombre: `Prueba aislada ${caso}`, slug: `${marca}-${caso}`, publicado: true,
        clientes: { create: { nombre: "Cliente conservado" } },
        configuracionSitio: { create: { borrador: { titulo: "Diseño conservado" }, publicada: { titulo: "Diseño conservado" } } },
        suscripcion: { create: {
          plan: caso === "activa" ? "autogestionado" : "PRUEBA",
          estado: caso === "activa" ? "ACTIVA" : "CONFIGURACION_GRATUITA", precioMensual: 0,
          pruebaIniciaEn: fecha(-60), pruebaFinalizaEn: fecha(caso === "menos-de-30" ? -29 : caso === "prueba" ? 1 : -30),
          primerPagoEn: caso === "pago-previo" ? fecha(-50) : null,
          proximoCobro: caso === "activa" ? fecha(1) : null,
          ...(caso === "historial" ? { pagos: { create: { negocio: { connect: { slug: `${marca}-${caso}` } }, estado: "REEMBOLSADO", monto: 9900, idempotencia: `${marca}-pago` } } } : {}),
        } },
      } });
      ids.push(negocio.id); resultados[caso] = negocio.id;
    }
    await retirarSitiosSinPlan();
    await retirarSitiosSinPlan(); // Idempotencia, sin borrar la configuración.
    for (const [caso, id] of Object.entries(resultados)) {
      const negocio = await prisma.negocio.findUniqueOrThrow({ where: { id }, include: { configuracionSitio: true, clientes: true } });
      assert.equal(Boolean(negocio.sitioRetiradoEn), caso === "retirable", caso);
      assert.equal(negocio.publicado, caso !== "retirable", caso);
      assert.deepEqual(negocio.configuracionSitio!.publicada, { titulo: "Diseño conservado" });
      assert.equal(negocio.clientes.length, 1);
    }
    const id = resultados.retirable!;
    assert.equal((await restaurarSitioRetirado(prisma, id, "DUENO")).ok, false, "gratis no recupera");
    await prisma.suscripcion.update({ where: { negocioId: id }, data: {
      estado: "ACTIVA", plan: "autogestionado", primerPagoEn: new Date(), proximoCobro: fecha(30),
    } });
    assert.equal((await restaurarSitioRetirado(prisma, id, "PROFESIONAL")).ok, false);
    const consulta = new Request(`https://example.com/api/reservas-publicas/disponibilidad?slug=${marca}-retirable&servicioId=ficticio&sedeId=ficticia&profesionalId=ficticio&fecha=${fecha(1).toISOString().slice(0, 10)}`);
    assert.equal((await GET(consulta)).status, 404, "pagar no restaura un sitio retirado sin solicitarlo");
    assert.equal((await restaurarSitioRetirado(prisma, id, "DUENO")).ok, true);
    const recuperado = await prisma.negocio.findUniqueOrThrow({ where: { id }, include: { configuracionSitio: true, clientes: true } });
    assert.equal(recuperado.publicado, true); assert.equal(recuperado.sitioRetiradoEn, null);
    assert.equal(recuperado.slug, `${marca}-retirable`);
    assert.deepEqual(recuperado.configuracionSitio!.publicada, { titulo: "Diseño conservado" });
    assert.equal(recuperado.clientes[0]!.nombre, "Cliente conservado");
  } finally {
    await prisma.negocio.deleteMany({ where: { id: { in: ids }, slug: { startsWith: marca } } });
    await prisma.$disconnect(); await prismaWeb.$disconnect();
  }
});
