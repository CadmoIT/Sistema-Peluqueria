/** Navegador aislado: sin credenciales de pago, Google ni Resend. */
import { defineConfig, devices } from "@playwright/test";
import { comprobarBaseEquipo } from "./pruebas/equipo-fixture";
comprobarBaseEquipo();
const baseURL = "http://localhost:3108";
export default defineConfig({
  testDir: "./e2e-equipo",
  testIgnore: "presentacion-carla.spec.ts",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev -H localhost -p 3108",
    url: `${baseURL}/acceder`,
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      WEB_URL: baseURL,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET:
        "clave-publica-exclusiva-pruebas-locales-sin-cuentas-reales",
      CUENTAS_EQUIPO_HABILITADAS: "true",
      MERCADOPAGO_ACCESS_TOKEN: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GOOGLE_CALENDAR_CLIENT_ID: "",
      GOOGLE_CALENDAR_CLIENT_SECRET: "",
      RESEND_API_KEY: "",
      PUBLIC_SITE_DOMAIN: "",
    },
  },
});
