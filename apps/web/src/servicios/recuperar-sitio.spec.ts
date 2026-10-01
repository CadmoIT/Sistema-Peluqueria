/** Garantiza que el servidor rechace recuperaciones sin autorización o plan. */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { restaurarSitioRetirado } from "./recuperar-sitio.service";

test("recuperar verifica retiro, rol y Plus/Pro, y no modifica diseño ni datos", async (t) => {
  for (const caso of ["plus", "pro", "gratis", "vencido", "no-retirado", "profesional", "sin-configuracion"]) await t.test(caso, async () => {
    let escritura: unknown = null;
    let consultas = 0;
    const actual = {
      id: "negocio-propio", sitioRetiradoEn: caso === "no-retirado" ? null : new Date(),
      configuracionSitio: caso === "sin-configuracion" ? null : { publicada: { titulo: "Mi negocio" } },
      suscripcion: {
        plan: caso === "gratis" ? "PRUEBA" : caso === "pro" ? "pro" : "autogestionado", estado: "ACTIVA",
        proximoCobro: new Date(Date.now() + (caso === "vencido" ? -1 : 1) * 86_400_000),
      },
    };
    const db = { $transaction: async (fn: (tx: unknown) => unknown) => fn({ negocio: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => { consultas++; assert.equal(where.id, "negocio-propio"); return actual; },
      update: async (datos: unknown) => { escritura = datos; },
    } }) } as unknown as PrismaClient;
    const resultado = await restaurarSitioRetirado(db, "negocio-propio", caso === "profesional" ? "PROFESIONAL" : "DUENO");
    assert.equal(resultado.ok, ["plus", "pro"].includes(caso));
    if (resultado.ok) assert.deepEqual(escritura, { where: { id: "negocio-propio" }, data: { publicado: true, sitioRetiradoEn: null } });
    else assert.equal(escritura, null);
    if (caso === "profesional") assert.equal(consultas, 0);
  });
});
