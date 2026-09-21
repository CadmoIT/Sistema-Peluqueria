/** Reutiliza una sesión demo para no disparar la protección contra ingresos repetidos. */
import { test as base, expect, type BrowserContext } from "@playwright/test";
type EstadoSesion = Awaited<ReturnType<BrowserContext["storageState"]>>;
export const test = base.extend<{}, { sesionDemo: EstadoSesion }>({
  sesionDemo: [
    async ({ browser }, usar) => {
      const contexto = await browser.newContext();
      const page = await contexto.newPage();
      await page.goto("http://localhost:3000/acceder?modo=ingreso");
      await page.getByLabel("Email").fill("demo@turnosrapidos.com.ar");
      await page.locator('input[name="password"]').fill("DemoTurnos2026!");
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await expect(page).toHaveURL(/\/panel\/resumen$/, { timeout: 60000 });
      await page.waitForLoadState("load");
      await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
        timeout: 30_000,
      });
      await expect(
        page.getByRole("heading", { name: "Estudio Aurora" }),
      ).toBeVisible();
      const estado = await contexto.storageState();
      await contexto.close();
      await usar(estado);
    },
    { scope: "worker" },
  ],
  storageState: async ({ sesionDemo }, usar) => {
    await usar(sesionDemo);
  },
});
export { expect };
