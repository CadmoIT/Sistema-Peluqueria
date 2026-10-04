/** Ejercita venta y reversión con repositorio en memoria, sin tocar bases reales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma, type PrismaClient } from "@prisma/client";
import { vender } from "./ventas-operaciones.service";
import { anularOperacionEquipo } from "./operaciones-equipo.service";
import type { ContextoEquipo } from "./contexto-equipo.service";
function fixture() {
  let stock = 3;
  const ventas: Record<string, unknown>[] = [];
  const caja: Record<string, unknown>[] = [];
  const audit: Record<string, unknown>[] = [];
  const tx = {
    $queryRaw: async () => [],
    negocio: {
      findUniqueOrThrow: async () => ({
        configuracion: { descuentoEfectivo: 10 },
      }),
      update: async () => ({}),
    },
    sede: { findFirst: async () => ({ id: "s" }) },
    profesional: { findFirst: async () => ({ id: "p" }) },
    profesionalServicio: { findMany: async () => [{ servicioId: "svc" }] },
    producto: {
      findMany: async () => [
        { id: "prod", nombre: "Insumo", precio: new Prisma.Decimal(100) },
      ],
    },
    servicio: {
      findMany: async () => [
        { id: "svc", nombre: "Consulta", precio: new Prisma.Decimal(1000) },
      ],
    },
    existencia: {
      updateMany: async ({
        data,
      }: {
        data: { cantidad: { decrement?: number; increment?: number } };
      }) => {
        stock -= data.cantidad.decrement ?? 0;
        stock += data.cantidad.increment ?? 0;
        return { count: 1 };
      },
    },
    movimientoStock: { create: async () => ({}) },
    venta: {
      findUnique: async () => ventas[0] ?? null,
      findFirst: async ({ where }: { where: { actorUsuarioId?: string } }) =>
        where.actorUsuarioId &&
        where.actorUsuarioId !== ventas[0]?.actorUsuarioId
          ? null
          : (ventas[0] ?? null),
      create: async ({
        data,
      }: {
        data: Record<string, unknown> & { items: { create: unknown[] } };
      }) => {
        const v = {
          ...data,
          id: "v",
          creadoEn: new Date(),
          anuladoEn: null,
          items: data.items.create,
        };
        ventas.push(v);
        return v;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(ventas[0]!, data);
        return ventas[0]!;
      },
    },
    movimientoCaja: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const m = { ...data, id: `m${caja.length}` };
        caja.push(m);
        return m;
      },
      findFirst: async () => caja[0],
    },
    auditoria: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        audit.push(data);
        return data;
      },
      findFirst: async ({ where }: { where: { recursoId: string } }) =>
        audit.find((a) => a.recursoId === where.recursoId),
    },
  };
  const db = {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient;
  const c = {
    usuario: { id: "u", name: "Lucía" },
    negocio: { id: "n", configuracion: {} },
    identidad: { rol: "PROFESIONAL", profesionalId: "p", sedeIds: ["s"] },
  } as unknown as ContextoEquipo;
  return { db, c, ventas, caja, audit, stock: () => stock };
}
test("venta descuenta sólo servicios, guarda el medio y deshacer restaura una sola vez", async () => {
  const f = fixture();
  const entrada = {
    sedeId: "s",
    atribucion: "otra",
    idempotencia: "12345678-1234-1234-1234-123456789012",
    medio: "EFECTIVO",
    items: [
      { id: "svc", tipo: "servicio", cantidad: 1 },
      { id: "prod", tipo: "producto", cantidad: 1 },
    ],
  };
  const v = await vender(f.db, "n", entrada, f.c);
  assert.equal(Number(v.total), 1000); // Servicio 900 + producto 100.
  assert.equal(Number(v.precioBase), 1100);
  assert.equal(v.profesionalId, "p");
  assert.equal(v.medio, "EFECTIVO");
  assert.equal(f.stock(), 2);
  assert.equal((await vender(f.db, "n", entrada, f.c)).id, v.id);
  assert.equal(f.caja.length, 1);
  await anularOperacionEquipo(f.db, f.c, "venta", v.id, "Deshacer", true);
  assert.equal(f.stock(), 3);
  assert.equal(f.caja.length, 2);
  assert.equal(f.caja[1]!.tipo, "EGRESO");
  await anularOperacionEquipo(f.db, f.c, "venta", v.id, "Deshacer", true);
  assert.equal(f.stock(), 3);
  assert.equal(f.caja.length, 2);
});
test("deshacer rechaza otro actor, otros tipos y ventas fuera de plazo", async () => {
  const f = fixture();
  const v = await vender(
    f.db,
    "n",
    {
      sedeId: "s",
      atribucion: "p",
      idempotencia: "12345678-1234-1234-1234-123456789012",
      medio: "MERCADO_PAGO",
      items: [{ id: "svc", tipo: "servicio", cantidad: 1 }],
    },
    f.c,
  );
  assert.equal(Number(v.total), 1000);
  const otro = { ...f.c, usuario: { ...f.c.usuario, id: "otro" } };
  await assert.rejects(() =>
    anularOperacionEquipo(f.db, otro, "venta", v.id, "Deshacer", true),
  );
  await assert.rejects(() =>
    anularOperacionEquipo(f.db, f.c, "compra", v.id, "Deshacer", true),
  );
  f.ventas[0]!.deshacerHasta = new Date(0);
  await assert.rejects(() =>
    anularOperacionEquipo(f.db, f.c, "venta", v.id, "Deshacer", true),
  );
  assert.equal(f.caja.length, 1);
});
