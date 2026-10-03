/** Siembra datos anteriores y comprueba la migración en un esquema exclusivamente local. */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { comprobarBaseEquipo } from "./equipo-fixture";
comprobarBaseEquipo();
assert.equal(
  new URL(process.env.DATABASE_URL!).searchParams.get("schema"),
  "equipo_prueba_compatibilidad_20261003",
);
const db = new PrismaClient();
async function comprobar() {
  try {
    if (process.argv[2] === "sembrar") {
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO "Negocio" ("id","nombre","slug","actualizadoEn") VALUES ('compat-negocio','Negocio anterior','compat-negocio',NOW())`;
        await tx.$executeRaw`INSERT INTO "Sede" ("id","negocioId","nombre","direccion") VALUES ('compat-sede','compat-negocio','Local anterior','Dirección de prueba')`;
        await tx.$executeRaw`INSERT INTO "Profesional" ("id","negocioId","nombre") VALUES ('compat-profesional','compat-negocio','Profesional anterior')`;
        await tx.$executeRaw`INSERT INTO "Cliente" ("id","negocioId","nombre","notas") VALUES ('compat-cliente','compat-negocio','Cliente anterior','Nota histórica sin autor')`;
        await tx.$executeRaw`INSERT INTO "Reserva" ("id","negocioId","sedeId","profesionalId","clienteId","codigo","estado","inicio","fin","total","sena") VALUES ('compat-reserva','compat-negocio','compat-sede','compat-profesional','compat-cliente','ANTERIOR','COMPLETADA','2025-01-02T15:00Z','2025-01-02T15:30Z',1500.25,100)`;
        await tx.$executeRaw`INSERT INTO "Compra" ("id","negocioId","sedeId","total") VALUES ('compat-compra','compat-negocio','compat-sede',500.25)`;
        await tx.$executeRaw`INSERT INTO "MovimientoCaja" ("id","negocioId","sedeId","tipo","concepto","monto","origen","profesionalId") VALUES ('compat-caja','compat-negocio','compat-sede','INGRESO','Cobro anterior',1500.25,'EQUIPO','compat-profesional')`;
      });
      console.info(
        "Datos históricos de prueba preparados con el esquema anterior.",
      );
    } else if (process.argv[2] === "verificar") {
      const reserva = await db.reserva.findUniqueOrThrow({
          where: { id: "compat-reserva" },
        }),
        cliente = await db.cliente.findUniqueOrThrow({
          where: { id: "compat-cliente" },
        }),
        caja = await db.movimientoCaja.findUniqueOrThrow({
          where: { id: "compat-caja" },
        }),
        compra = await db.compra.findUniqueOrThrow({
          where: { id: "compat-compra" },
        }),
        profesional = await db.profesional.findUniqueOrThrow({
          where: { id: "compat-profesional" },
        }),
        vinculo = await db.profesionalCliente.findUniqueOrThrow({
          where: {
            profesionalId_clienteId: {
              profesionalId: profesional.id,
              clienteId: cliente.id,
            },
          },
        });
      assert.equal(reserva.total.toString(), "1500.25");
      assert.equal(caja.monto.toString(), "1500.25");
      assert.equal(compra.total.toString(), "500.25");
      assert.equal(caja.profesionalId, profesional.id);
      assert.equal(caja.actorUsuarioId, null);
      assert.equal(compra.actorUsuarioId, null);
      assert.equal(cliente.notas, "Nota histórica sin autor");
      assert.equal(vinculo.notas, null);
      assert.equal(profesional.membresiaId, null);
      assert.equal(
        await db.membresia.count({ where: { negocioId: "compat-negocio" } }),
        0,
      );
      assert.equal(
        await db.invitacionEquipo.count({
          where: { negocioId: "compat-negocio" },
        }),
        0,
      );
      console.info(
        "Migración compatible: importes, fichas y notas originales conservados; sin cuentas ni autores inventados.",
      );
    } else throw new Error("Usar sembrar antes de migrar y verificar después.");
  } finally {
    await db.$disconnect();
  }
}
void comprobar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
