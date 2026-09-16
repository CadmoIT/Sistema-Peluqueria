/** Recorre el panel demo y el micrositio con resoluciones de escritorio y móvil. */
import { expect, test } from "./fixtures/panel-fixture";

test("la cuenta demo puede entrar y recorrer el panel", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/acceder?modo=ingreso");
  await page.getByLabel("Email").fill("demo@turnosrapidos.com.ar");
  await page.locator('input[name="password"]').fill("DemoTurnos2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL(/\/panel\/resumen$/, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Estudio Aurora" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Página Web/ })).toBeVisible();
  await expect(page.locator(".resumen-pagina__cabecera svg")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Nuevo turno", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ver plan y facturación" }),
  ).toHaveAttribute("href", "/panel/facturacion");
  await expect(page.locator(".resumen-lateral .acceso-resumen")).toHaveCount(3);
  await page.locator(".resumen-lateral .acceso-resumen").first().hover();
  await expect(
    page.locator(".resumen-lateral .acceso-resumen").first(),
  ).toHaveCSS("background-color", "rgb(241, 243, 244)");
  await expect(
    page.getByRole("link", { name: /Turnos de hoy/ }),
  ).toHaveAttribute("href", "/panel/agenda");
  await expect(
    page.getByRole("link", { name: /Próximo turno/ }),
  ).toHaveAttribute("href", "/panel/agenda");
  await expect(page.getByRole("link", { name: /Clientes:/ })).toHaveAttribute(
    "href",
    "/panel/clientes",
  );
  await expect(
    page.getByRole("link", { name: /Ingresos de hoy/ }),
  ).toHaveAttribute("href", "/panel/reportes");
  await page.screenshot({
    path: "test-results/resumen-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Contraer menú" }),
  ).toBeVisible();
  await expect(page.locator(".panel-header")).toHaveCount(0);

  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(
    page.getByRole("button", { name: "Expandir menú" }),
  ).toBeVisible();
  await expect(page.locator(".panel-ruta-contraida")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/resumen-sidebar-plegado.png",
    fullPage: true,
  });
  await page.locator(".nav-panel--contraido summary").click();
  await expect(
    page.locator(".nav-panel--contraido").getByRole("link", {
      name: "Pagos y Facturación",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir menú" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expandir menú" }).click();
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel\/resumen$/);

  await page.goto("/panel/agenda");
  await expect(page.locator(".fc").first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Local" })).toBeVisible();

  await page.goto("/panel/clientes");
  await expect(page.getByRole("heading", { name: /Clientes/ })).toBeVisible();

  await page.goto("/panel/facturacion");
  await expect(
    page.getByRole("heading", { name: "Pagos y Facturación" }),
  ).toBeVisible();
  await expect(page.getByText("Pago ficticio · Demo").first()).toBeVisible();

  await page.goto("/panel/mi-sitio");
  await expect(page.getByText("Colores", { exact: true })).toBeVisible();
});

test("el sitio demo permite buscar y elegir un servicio con teclado", async ({
  page,
}) => {
  await page.goto("/sitio/estudio-aurora-demo");
  await expect(
    page.getByRole("heading", { name: "Estudio Aurora", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Elegí tu próximo turno" }),
  ).toBeVisible();
  await page.getByPlaceholder("Buscar un servicio").fill("corte");
  await expect(
    page.getByRole("button", { name: "Seleccionar", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Seleccionar", exact: true })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Seleccionado" }).first(),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", { name: "Reservar", exact: true }).first(),
  ).toHaveAttribute("href", /servicios=/);
  await expect(
    page.getByRole("link", { name: "Contactar por WhatsApp" }),
  ).toBeVisible();
});

test("facturación, avisos y reportes muestran estados reales de la demo", async ({
  page,
}) => {
  await page.goto("/panel/facturacion");
  await expect(page.getByText("Plan activo · Plus")).toBeVisible();
  await expect(page.getByRole("heading", { name: "PRO" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Próximamente" }),
  ).toBeDisabled();

  await page.goto("/panel/configuracion#avisos");
  await expect(
    page.getByRole("heading", { name: "Mensajes automáticos" }),
  ).toBeVisible();
  await expect(
    page.getByText("El correo todavía no está configurado.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Ana, tu turno", { exact: false })).toBeVisible();

  await page.goto("/panel/reportes");
  await expect(page.getByLabel("Local del reporte")).toBeVisible();
});

test("panel y micrositio no desbordan en los anchos principales", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sitio/estudio-aurora-demo");
  await expect(
    page.getByRole("heading", { name: "Elegí tu próximo turno" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.goto("/panel/resumen");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator("#panel-menu-movil")
    .getByRole("link", { name: "Clientes" })
    .click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
  await expect(page.locator("#panel-menu-movil")).not.toHaveClass(/abierto/);
  for (const ancho of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const ruta of [
      "/panel/resumen",
      "/panel/agenda",
      "/panel/clientes",
      "/panel/mi-sitio",
    ]) {
      await page.goto(ruta);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${ruta} en ${ancho}px`,
      ).toBeLessThanOrEqual(ancho);
    }
  }
});
