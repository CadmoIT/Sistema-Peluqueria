/** Lee la conexión requerida por el proceso de tareas en segundo plano. */
export type ConfiguracionWorker = {
  databaseUrl: string | null;
};

export function cargarConfiguracionWorker(): ConfiguracionWorker {
  return {
    databaseUrl: process.env.DATABASE_URL ?? null,
  };
}
