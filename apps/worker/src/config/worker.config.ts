/** Lee la conexión requerida por el proceso de tareas en segundo plano. */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type ConfiguracionWorker = {
  databaseUrl: string | null;
};

function cargarEntornoLocal() {
  const candidatos = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];
  const archivo = candidatos.find((ruta) => existsSync(ruta));

  if (archivo) process.loadEnvFile(archivo);
}

export function cargarConfiguracionWorker(): ConfiguracionWorker {
  cargarEntornoLocal();

  return {
    databaseUrl: process.env.DATABASE_URL ?? null,
  };
}
