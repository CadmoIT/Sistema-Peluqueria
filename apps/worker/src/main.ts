/** Inicia el worker solamente cuando existe una conexión a PostgreSQL. */
import { cargarConfiguracionWorker } from "./config/worker.config.js";
import { iniciarWorker } from "./worker.js";

async function iniciar() {
  const configuracion = cargarConfiguracionWorker();

  if (!configuracion.databaseUrl) {
    console.log("Worker preparado: define DATABASE_URL para iniciar la cola.");
    return;
  }

  await iniciarWorker(configuracion.databaseUrl);
}

void iniciar();
