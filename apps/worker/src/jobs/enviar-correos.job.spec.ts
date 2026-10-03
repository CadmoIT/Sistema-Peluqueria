/** Simula Resend y la bandeja; nunca envía correos ni consulta bases reales. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "../lib/prisma.js";
import { procesarCorreosPendientes } from "./enviar-correos.job.js";

test("revalida invitaciones reclamadas y no entrega enlaces cancelados, vencidos o de un profesional inactivo", async () => {
  const originales = {
    query: prisma.$queryRaw,
    updateMany: prisma.correoPendiente.updateMany,
    update: prisma.correoPendiente.update,
    invitacion: prisma.invitacionEquipo.findUnique,
    fetch: globalThis.fetch,
    clave: process.env.RESEND_API_KEY,
  };
  const resultados: Array<{ id: string; estado: string }> = [];
  let estado = "REVOCADA",
    activo = true,
    expiraEn = new Date(Date.now() + 60_000),
    entregas = 0;
  prisma.$queryRaw = (async () => [
    {
      id: "correo",
      destinatario: "equipo@example.com",
      asunto: "Prueba",
      texto: "Enlace de prueba",
      html: null,
      responderA: null,
      claveIdempotencia: "equipo-prueba",
      intentos: 1,
      expiraEn: new Date(Date.now() + 60_000),
    },
  ]) as unknown as typeof prisma.$queryRaw;
  prisma.correoPendiente.updateMany = (async () => ({
    count: 0,
  })) as typeof prisma.correoPendiente.updateMany;
  prisma.correoPendiente.update = (async ({
    where,
    data,
  }: {
    where: { id: string };
    data: { estado: string };
  }) => {
    resultados.push({ id: where.id, estado: data.estado });
    return {};
  }) as unknown as typeof prisma.correoPendiente.update;
  prisma.invitacionEquipo.findUnique = (async () => ({
    estado,
    expiraEn,
    profesional: { activo },
  })) as unknown as typeof prisma.invitacionEquipo.findUnique;
  process.env.RESEND_API_KEY = "re_prueba_simulada";
  globalThis.fetch = async () => {
    entregas++;
    return Response.json({ id: "resend-simulado" });
  };
  try {
    await procesarCorreosPendientes([]);
    estado = "PENDIENTE";
    expiraEn = new Date(0);
    await procesarCorreosPendientes([]);
    expiraEn = new Date(Date.now() + 60_000);
    activo = false;
    await procesarCorreosPendientes([]);
    assert.equal(entregas, 0);
    activo = true;
    await procesarCorreosPendientes([]);
    assert.equal(entregas, 1);
    assert.deepEqual(
      resultados.map((r) => r.estado),
      ["FALLIDO", "FALLIDO", "FALLIDO", "ENVIADO"],
    );
  } finally {
    prisma.$queryRaw = originales.query;
    prisma.correoPendiente.updateMany = originales.updateMany;
    prisma.correoPendiente.update = originales.update;
    prisma.invitacionEquipo.findUnique = originales.invitacion;
    globalThis.fetch = originales.fetch;
    if (originales.clave === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originales.clave;
  }
});
