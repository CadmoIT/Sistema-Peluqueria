/** Pruebas aisladas del panel: nunca reutiliza el servidor ni la base de producción. */
import { defineConfig, devices } from "@playwright/test";

const conexion = new URL(process.env.DATABASE_URL ?? "");
if (process.env.PRUEBAS_VENCIMIENTO_MP !== "1" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(conexion.hostname) ||
  !/^mp_vencimiento_prueba_[a-z0-9_]+$/.test(conexion.searchParams.get("schema") ?? "")) {
  throw new Error("Estas pruebas requieren una base local con esquema mp_vencimiento_prueba_* y autorización explícita.");
}
const baseURL = "http://127.0.0.1:3107";
export default defineConfig({
  testDir: "./e2e-suscripcion", workers: 1, timeout: 120_000, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec next dev -H 127.0.0.1 -p 3107", url: `${baseURL}/acceder`, timeout: 120_000, reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!, WEB_URL: baseURL, BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "clave-publica-exclusiva-pruebas-locales-sin-cuentas-reales",
      MERCADOPAGO_ACCESS_TOKEN: "", MERCADOPAGO_TEST_PAYER_EMAIL: "",
      PUBLIC_SITE_DOMAIN: "",
    },
  },
});
