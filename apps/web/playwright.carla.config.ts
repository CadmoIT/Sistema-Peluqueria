/** Ejecuta únicamente la presentación offline; no inicia servicios ni consulta PostgreSQL. */
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-equipo",
  testMatch: "presentacion-carla.spec.ts",
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], screenshot: "only-on-failure" },
});
