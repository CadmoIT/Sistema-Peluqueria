/** Verifica la presentación local de Carla sin base de datos ni proveedores externos. */
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("presentación de Carla: identidad, dos agendas y acceso visual del empleado", async ({
  page,
}) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(
    pathToFileURL(resolve("public/demo/carla/presentacion.html")).href,
  );
  await expect(
    page.getByRole("heading", { name: "Hola, Carla" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".marca img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBeTruthy();
  await page.locator('nav button[data-vista="Equipo"]').click();
  await expect(page.locator(".profesional.vinculada")).toContainText(
    "Cuenta vinculada",
  );
  await expect(page.locator(".profesional").nth(1)).toContainText(
    "Invitación pendiente",
  );
  await page.screenshot({
    path: "test-results/carla-equipo-presentacion.png",
    fullPage: true,
  });
  await page.locator('nav button[data-vista="Agenda"]').click();
  await page.locator('[data-filtro="Lucía"]').click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.locator('[data-filtro="Valeria"]').click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  for (const seccion of [
    "Pacientes",
    "Servicios",
    "Inventario",
    "Compras",
    "Caja",
    "Reportes",
    "Actividad",
    "Mi sitio",
  ]) {
    await page.locator(`nav button[data-vista="${seccion}"]`).click();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.locator("#rol").selectOption("empleada");
  await expect(page.locator('nav button[data-vista="Equipo"]')).toHaveCount(0);
  await page.locator('nav button[data-vista="Caja"]').click();
  await expect(page.getByRole("heading", { name: "Mis cobros" })).toBeVisible();
  expect(await page.locator("tbody").textContent()).not.toContain("Valeria");
  await page.locator('nav button[data-vista="Resumen"]').click();
  await expect(
    page.getByRole("heading", { name: "Hola, Lucía" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/carla-empleada-presentacion.png",
    fullPage: true,
  });
  await page.locator("#rol").selectOption("duena");
  await page.screenshot({
    path: "test-results/carla-resumen-presentacion.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/carla-movil-presentacion.png",
    fullPage: true,
  });
  expect(errores).toEqual([]);
});
