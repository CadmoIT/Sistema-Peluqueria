/** Comprueba el cierre exterior de acciones, diálogos y colores sin enviar formularios. */
import { expect, test } from "./fixtures/panel-fixture";

test("todos los formularios flotantes cierran afuera y permanecen abiertos al tocar adentro", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const ruta of [
    "agenda",
    "clientes",
    "servicios",
    "equipo",
    "inventario",
    "caja",
  ]) {
    await page.goto(`/panel/${ruta}`);
    const cantidad = await page.locator("details.desplegable-accion").count();
    for (let i = 0; i < cantidad; i++) {
      const accion = page.locator("details.desplegable-accion").nth(i);
      await accion.locator("summary").click();
      await expect(accion).toHaveAttribute("open", "");
      await accion
        .locator(".formulario-flotante, .popover-panel")
        .click({ position: { x: 8, y: 8 } });
      await expect(accion).toHaveAttribute("open", "");
      await page.locator("h1").click();
      await expect(accion).not.toHaveAttribute("open", "");
    }
  }
});

test("importación, edición de clientes y Google Calendar cierran con fondo y Escape", async ({
  page,
}) => {
  await page.goto("/panel/clientes");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.locator(".dialogo-importacion h2").click();
  await expect(page.locator(".dialogo-importacion")).toBeVisible();
  await page.locator(".dialogo-fondo").click({ position: { x: 2, y: 2 } });
  await expect(page.locator(".dialogo-importacion")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Editar cliente", exact: true })
    .first()
    .click();
  await page.locator(".dialogo-turno h2").click();
  await expect(page.locator(".dialogo-turno")).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(page.locator(".dialogo-turno")).toHaveCount(0);
  await page.goto("/panel/agenda");
  await page
    .getByRole("button", { name: "Google Calendar", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Google Calendar" })
    .click({ position: { x: 8, y: 8 } });
  await expect(
    page.getByRole("dialog", { name: "Google Calendar" }),
  ).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(
    page.getByRole("dialog", { name: "Google Calendar" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Google Calendar", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Google Calendar" }),
  ).toHaveCount(0);
});

test("el selector de color cierra afuera sin cerrar los apartados del editor", async ({
  page,
}) => {
  await page.goto("/panel/mi-sitio");
  const colores = page
    .locator(".grupo-editor")
    .filter({ has: page.locator(".selector-color") });
  if (
    !(await colores.evaluate(
      (elemento) => (elemento as HTMLDetailsElement).open,
    ))
  )
    await colores.locator(":scope > summary").click();
  const selector = colores.locator(".selector-color").first();
  await selector.locator("summary").click();
  await expect(selector).toHaveAttribute("open", "");
  await page.getByRole("heading", { name: "Mi sitio", exact: true }).click();
  await expect(selector).not.toHaveAttribute("open", "");
  await expect(colores).toHaveAttribute("open", "");
});
