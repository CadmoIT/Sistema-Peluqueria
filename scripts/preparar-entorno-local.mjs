/** Prepara Docker, PostgreSQL y las migraciones antes de iniciar el desarrollo local. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ejecutableDockerDesktop =
  "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";

function ejecutar(comando, argumentos, opciones = {}) {
  return spawnSync(comando, argumentos, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: opciones.silencioso ? "ignore" : "inherit",
    timeout: opciones.timeout,
    windowsHide: true,
  });
}

function dockerDisponible() {
  const resultado = ejecutar(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    {
      silencioso: true,
      timeout: 4_000,
    },
  );
  return resultado.status === 0;
}

function postgresDisponible() {
  const resultado = ejecutar(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      "turnos",
      "-d",
      "turnos_rapidos",
    ],
    { silencioso: true, timeout: 4_000 },
  );
  return resultado.status === 0;
}

async function esperar(condicion, intentos, demora) {
  for (let intento = 0; intento < intentos; intento += 1) {
    if (condicion()) return true;
    await new Promise((resolver) => setTimeout(resolver, demora));
  }
  return false;
}

async function prepararDocker() {
  if (dockerDisponible()) return;

  if (process.platform !== "win32" || !existsSync(ejecutableDockerDesktop)) {
    throw new Error(
      "Docker no está iniciado. Abrí Docker Desktop y volvé a ejecutar pnpm dev.",
    );
  }

  console.log("Docker Desktop está cerrado. Iniciándolo...");
  const dockerDesktop = spawn(ejecutableDockerDesktop, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  dockerDesktop.unref();

  const inicioCorrecto = await esperar(dockerDisponible, 30, 2_000);
  if (!inicioCorrecto) {
    throw new Error(
      "Docker Desktop no quedó listo. Abrilo manualmente y volvé a ejecutar pnpm dev.",
    );
  }
}

async function prepararPostgres() {
  const inicio = ejecutar("docker", ["compose", "up", "-d", "postgres"]);
  if (inicio.status !== 0) {
    throw new Error("No se pudo iniciar PostgreSQL con Docker Compose.");
  }

  const postgresListo = await esperar(postgresDisponible, 20, 1_000);
  if (!postgresListo) {
    throw new Error(
      "PostgreSQL no quedó saludable dentro del tiempo esperado.",
    );
  }
}

function aplicarMigraciones() {
  const prisma = join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );
  const migracion = ejecutar(process.execPath, [prisma, "migrate", "deploy"]);
  if (migracion.status !== 0) {
    throw new Error("No se pudieron aplicar las migraciones de Prisma.");
  }
}

try {
  await prepararDocker();
  await prepararPostgres();
  aplicarMigraciones();
  console.log(
    "Entorno local preparado: PostgreSQL está listo en localhost:5433.",
  );
} catch (error) {
  console.error(`No se pudo preparar el entorno local: ${error.message}`);
  process.exit(1);
}
