/** Mide lecturas, índices y planes de PostgreSQL sin alterar cuentas ni datos operativos. */
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "better-auth/crypto";

process.loadEnvFile(resolve(process.cwd(), "../../.env"));
const db = new PrismaClient();
const redondear = (n: number) => Math.round(n * 100) / 100;
async function medir(nombre: string, tarea: () => Promise<unknown>, veces = 5) {
  const tiempos: number[] = [];
  for (let i = 0; i < veces; i++) {
    const inicio = performance.now();
    await tarea();
    tiempos.push(redondear(performance.now() - inicio));
  }
  console.log(JSON.stringify({ prueba: nombre, ms: tiempos }));
}
async function main() {
  await medir(
    "PostgreSQL: primera conexión y consultas calientes",
    () => db.$queryRaw`SELECT 1`,
  );
  const tablas =
    await db.$queryRaw`SELECT relname AS tabla, n_live_tup AS filas_estimadas, seq_scan, idx_scan FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY relname`;
  const indices =
    await db.$queryRaw`SELECT tablename AS tabla, indexname AS indice, indexdef AS definicion FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname`;
  const relaciones =
    await db.$queryRaw`SELECT c.conrelid::regclass::text AS tabla, c.conname AS nombre, pg_get_constraintdef(c.oid) AS definicion, c.convalidated AS validada FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f' ORDER BY tabla, nombre`;
  const conexiones =
    await db.$queryRaw`SELECT state AS estado, wait_event_type AS tipo_espera, count(*)::int AS cantidad FROM pg_stat_activity WHERE datname=current_database() GROUP BY state, wait_event_type`;
  const indicesInvalidos =
    await db.$queryRaw`SELECT count(*)::int AS cantidad FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid`;
  console.log(
    JSON.stringify({
      relaciones_totales: (relaciones as unknown[]).length,
      relaciones_no_validadas: (
        relaciones as Array<{ validada: boolean }>
      ).filter((r) => !r.validada).length,
      indices_invalidos: indicesInvalidos,
      conexiones,
    }),
  );
  if (process.argv.includes("--detallado"))
    console.log(
      JSON.stringify({ tablas, indices, relaciones }, (_, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
  const conteos = await Promise.all([
    db.usuario.count(),
    db.negocio.count(),
    db.cliente.count(),
    db.reserva.count(),
    db.producto.count(),
    db.movimientoCaja.count(),
  ]);
  console.log(
    JSON.stringify({
      filas_reales: Object.fromEntries(
        [
          "Usuario",
          "Negocio",
          "Cliente",
          "Reserva",
          "Producto",
          "MovimientoCaja",
        ].map((tabla, i) => [tabla, conteos[i]]),
      ),
      indices_totales: (indices as unknown[]).length,
    }),
  );
  const relevantes = (
    indices as Array<{ tabla: string; indice: string; definicion: string }>
  ).filter((i) =>
    [
      "Reserva",
      "MovimientoCaja",
      "Cliente",
      "CuentaOAuth",
      "Membresia",
    ].includes(i.tabla),
  );
  console.log(JSON.stringify({ indices_relevantes: relevantes }));
  const negocio = await db.negocio.findFirst({
    orderBy: { reservas: { _count: "desc" } },
    select: { id: true, zonaHoraria: true },
  });
  const membresia =
    negocio &&
    (await db.membresia.findFirst({
      where: { negocioId: negocio.id, activo: true },
      select: { usuarioId: true },
    }));
  const usuario = membresia && { id: membresia.usuarioId };
  if (negocio && usuario) {
    const reserva = await db.reserva.findFirst({
      where: { negocioId: negocio.id },
      orderBy: { inicio: "desc" },
      select: { inicio: true, clienteId: true },
    });
    const desde = new Date(reserva?.inicio ?? Date.now());
    desde.setUTCHours(0, 0, 0, 0);
    const hasta = new Date(desde.getTime() + 86_400_000);
    await medir("Membresía y negocio con suscripción", () =>
      db.membresia.findFirst({
        where: { usuarioId: usuario.id, activo: true },
        include: { negocio: { include: { suscripcion: true } } },
      }),
    );
    await medir("Reservas del día con relaciones", () =>
      db.reserva.findMany({
        where: { negocioId: negocio.id, inicio: { gte: desde, lt: hasta } },
        include: {
          cliente: true,
          profesional: true,
          servicios: { include: { servicio: true } },
        },
      }),
    );
    await medir("Clientes con última reserva y contador", () =>
      db.cliente.findMany({
        where: { negocioId: negocio.id },
        include: {
          reservas: {
            select: { inicio: true },
            orderBy: { inicio: "desc" },
            take: 1,
          },
          _count: { select: { reservas: true } },
        },
        orderBy: { creadoEn: "desc" },
      }),
    );
    await medir("Movimientos del mes", () =>
      db.movimientoCaja.findMany({
        where: {
          negocioId: negocio.id,
          creadoEn: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
        select: { creadoEn: true, monto: true, tipo: true },
      }),
    );
    const planes = await Promise.all([
      db.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "id" FROM "Reserva" WHERE "negocioId"=${negocio.id} AND "inicio">=${desde} AND "inicio"<${hasta} ORDER BY "inicio"`,
      ),
      db.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "id" FROM "MovimientoCaja" WHERE "negocioId"=${negocio.id} AND "creadoEn">=${desde} ORDER BY "creadoEn"`,
      ),
      db.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "inicio" FROM "Reserva" WHERE "clienteId"=${reserva?.clienteId ?? "sin-cliente"} ORDER BY "inicio" DESC LIMIT 1`,
      ),
    ]);
    console.log(
      JSON.stringify({
        planes: planes.map((resultado) => {
          const plan = (
            resultado as Array<{
              "QUERY PLAN": Array<{
                "Execution Time": number;
                Plan: Record<string, unknown>;
              }>;
            }>
          )[0]!["QUERY PLAN"][0]!;
          return {
            ejecucion_ms: plan["Execution Time"],
            nodo: plan.Plan["Node Type"],
            indice: plan.Plan["Index Name"],
            filas: plan.Plan["Actual Rows"],
          };
        }),
      }),
    );
  }
  const claveSintetica = "Auditoria-local-sin-cuenta-2026!";
  const hash = await hashPassword(claveSintetica);
  await medir(
    "Contraseña sintética: scrypt (sin iniciar sesión)",
    () => verifyPassword({ hash, password: claveSintetica }),
    3,
  );
  for (const ruta of ["/precios", "/acceder?modo=ingreso"]) {
    await medir(
      `HTTP público ${ruta}`,
      async () => {
        const r = await fetch(`http://localhost:3000${ruta}`);
        await r.text();
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      },
      3,
    );
  }
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
