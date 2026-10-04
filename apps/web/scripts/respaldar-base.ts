/** Exporta datos completos en una transacción consistente antes de migraciones aditivas. */
import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
const destino = process.env.RESPALDO_DESTINO;
if (!destino) throw new Error("Falta RESPALDO_DESTINO fuera del repositorio.");
const db = new PrismaClient();
async function respaldar() {
  if (!destino) throw new Error("Falta RESPALDO_DESTINO.");
  try {
    const tablas = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const nombres = await tx.$queryRawUnsafe<Array<{ tablename: string }>>(
          "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
        );
        const resultado: Array<{ tabla: string; filas: string[] }> = [];
        for (const { tablename } of nombres) {
          const identificador = '"' + tablename.replaceAll('"', '""') + '"';
          const filas = await tx.$queryRawUnsafe<Array<{ fila: string }>>(
            `SELECT row_to_json(t)::text AS fila FROM public.${identificador} t`,
          );
          resultado.push({ tabla: tablename, filas: filas.map((f) => f.fila) });
        }
        return resultado;
      },
      { isolationLevel: "RepeatableRead", timeout: 120000 },
    );
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(
      destino,
      JSON.stringify({
        formato: "postgres-row-json-v1",
        creadoEn: new Date().toISOString(),
        tablas,
      }),
      { flag: "wx" },
    );
    console.log(
      `Respaldo guardado: ${tablas.length} tablas, ${tablas.reduce((n, t) => n + t.filas.length, 0)} filas.`,
    );
  } finally {
    await db.$disconnect();
  }
}
void respaldar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
