/** Comprueba la carga en Chromium y WebKit reutilizando el servidor de desarrollo activo. */
import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch:
    /(?:carga-aplicacion|carga-panel|navegacion-carga-panel)\.spec\.ts/,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
