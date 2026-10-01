import assert from "node:assert/strict";
import { test } from "node:test";
import type { Job } from "pg-boss";
import { prisma } from "../lib/prisma.js";
import { procesarRetencionesVencidas } from "./vencer-retencion.job.js";

test("al terminar la gracia se pausa el impago, sin pausar períodos futuros o activos", async () => {
  const original = { reserva: prisma.reserva.updateMany, suscripcion: prisma.suscripcion.updateMany };
  const estados = [
    { estado: "EN_GRACIA", graciaHasta: new Date("2000-01-01") },
    { estado: "EN_GRACIA", graciaHasta: new Date("2100-01-01") },
    { estado: "ACTIVA", graciaHasta: new Date("2000-01-01") },
  ];
  prisma.reserva.updateMany = (async () => ({ count: 0 })) as typeof original.reserva;
  prisma.suscripcion.updateMany = (async ({ where, data }: {
    where: { estado: string; graciaHasta: { lte: Date } }; data: { estado: string };
  }) => {
    assert.equal(where.estado, "EN_GRACIA"); assert.equal(data.estado, "PAUSADA");
    for (const sub of estados) if (sub.estado === where.estado && sub.graciaHasta <= where.graciaHasta.lte) sub.estado = data.estado;
    return { count: 1 };
  }) as unknown as typeof original.suscripcion;
  try {
    await procesarRetencionesVencidas([{} as Job]);
    assert.deepEqual(estados.map((sub) => sub.estado), ["PAUSADA", "EN_GRACIA", "ACTIVA"]);
  } finally {
    prisma.reserva.updateMany = original.reserva; prisma.suscripcion.updateMany = original.suscripcion;
  }
});
