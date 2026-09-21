/** Comprueba animaciones, espera real y recuperación del ingreso sin modificar cuentas. */
import { test, expect } from "@playwright/test";

test("landing: muestra el calendario y libera la página cuando está lista", async ({
  page,
}) => {
  const errores: string[] = [];
  page.on("pageerror", (error) => errores.push(error.message));
  let liberarImagenes!: () => void;
  const imagenesPendientes = new Promise<void>((resolve) => {
    liberarImagenes = resolve;
  });
  await page.route("**/_next/image**", async (route) => {
    await imagenesPendientes;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const carga = page.getByTestId("carga-aplicacion");
  await expect(carga).toHaveAttribute("data-tipo", "landing");
  await expect(carga).toBeVisible();
  await expect(page.locator(".carga-pantalla .circular")).toBeVisible();
  await expect(page.locator(".carga-pantalla .path")).toHaveCSS(
    "animation-name",
    "carga-dash, carga-color",
  );
  await expect(page.locator(".carga-contenido")).toHaveAttribute("inert", "");
  // Superar el mínimo verifica que la carga real todavía mantiene el overlay.
  await page.waitForTimeout(2200);
  await expect(carga).toBeVisible();
  liberarImagenes();
  await expect(carga).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator(".carga-contenido")).not.toHaveAttribute(
    "inert",
    "",
  );
  expect(errores).toEqual([]);
});

test("login: espera en noviembre durante la petición y vuelve al formulario ante un error", async ({
  page,
}) => {
  let responder!: () => void;
  const permiso = new Promise<void>((resolve) => {
    responder = resolve;
  });
  await page.route("**/api/autenticacion/sign-in/email", async (route) => {
    await permiso;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Email o contraseña incorrectos.",
      }),
    });
  });
  await page.goto("/acceder?modo=ingreso");
  await page
    .getByLabel("Email", { exact: true })
    .fill("prueba-loader@example.invalid");
  await page.locator('input[name="password"]').fill("ContraseñaPrueba2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByTestId("carga-aplicacion")).toHaveAttribute(
    "data-tipo",
    "panel",
  );
  await expect(page.getByTestId("calendario-entrada")).toHaveAttribute(
    "data-fase",
    "giro",
    { timeout: 20_000 },
  );
  await page.screenshot({ path: "test-results/loader-panel.png" });
  await page.waitForTimeout(1600);
  await expect(page.getByTestId("carga-aplicacion")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".entrada-calendario__check")).toHaveCount(0);
  responder();
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
  await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ingresar", exact: true }),
  ).toBeEnabled();
});

test("login: un error de conexión no deja el loader bloqueado", async ({
  page,
}) => {
  await page.route("**/api/autenticacion/sign-in/email", (route) =>
    route.abort("failed"),
  );
  await page.goto("/acceder?modo=ingreso");
  await page
    .getByLabel("Email", { exact: true })
    .fill("prueba-loader@example.invalid");
  await page.locator('input[name="password"]').fill("ContraseñaPrueba2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: "Ingresar", exact: true }),
  ).toBeEnabled();
});

test("movimiento reducido y pantalla móvil", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".carga-pantalla .path")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.screenshot({ path: "test-results/loader-landing-movil.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 60_000,
  });
});

test("sin JavaScript el loader no tapa el contenido", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("http://localhost:3000/");
  await expect(page.getByTestId("carga-aplicacion")).toBeHidden();
  await expect(page.locator(".carga-contenido")).not.toHaveAttribute(
    "inert",
    "",
  );
  await contexto.close();
});
