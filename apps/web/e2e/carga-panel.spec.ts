/** Verifica el ingreso real y la carga del panel usando solamente la cuenta demo existente. */
import { test, expect } from "@playwright/test";

test("ingreso real: conserva el loader hasta que el resumen esté listo", async ({
  page,
}) => {
  await page.goto("/acceder?modo=ingreso");
  await page
    .getByLabel("Email", { exact: true })
    .fill("demo@turnosrapidos.com.ar");
  await page.locator('input[name="password"]').fill("DemoTurnos2026!");
  const respuesta = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/autenticacion/sign-in/email") &&
      r.request().method() === "POST",
  );
  const inicio = Date.now();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByTestId("carga-aplicacion")).toHaveAttribute(
    "data-tipo",
    "panel",
  );
  const resultado = await respuesta;
  console.log(
    JSON.stringify({
      prueba: "Login demo HTTP (incluye primera compilación si la hay)",
      ms: Date.now() - inicio,
      estado: resultado.status(),
    }),
  );
  expect(resultado.status()).toBe(200);
  await expect(page).toHaveURL(/\/panel\/resumen$/, { timeout: 60_000 });
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: "Estudio Aurora" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Clientes", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("carga-aplicacion")).toHaveAttribute(
    "data-tipo",
    "panel",
  );
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 60_000,
  });
});
