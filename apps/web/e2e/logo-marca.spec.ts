/** Verifica que el logo transparente oficial se comparte sin recortes ni fondos añadidos. */
import { expect, test } from "./fixtures/panel-fixture";

test("landing, acceso y panel utilizan el nuevo PNG oficial", async ({
  page,
  request,
}) => {
  const icono = await request.get("/marca/logo-turnos-rapidos.png");
  expect(icono.ok()).toBeTruthy();
  expect(icono.headers()["content-type"]).toContain("image/png");

  for (const ruta of ["/", "/acceder?modo=ingreso", "/panel/resumen"]) {
    await page.goto(ruta);
    if (ruta.startsWith("/panel/")) {
      const abrirMenu = page.getByRole("button", { name: "Expandir menú" });
      if (await abrirMenu.isVisible()) await abrirMenu.click();
    }
    const logo = page.locator(".logo-turnos__imagen:visible").first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", /logo-turnos-rapidos.*\.png/);
    await expect(logo).toHaveCSS("border-radius", "0px");
    await expect(logo).toHaveCSS("object-fit", "contain");
    await expect
      .poll(() =>
        logo.evaluate((imagen) => (imagen as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/marca/logo-turnos-rapidos.png",
    );
  }
});
