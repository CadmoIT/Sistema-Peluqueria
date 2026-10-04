/** Regresión de carga fría y controles visuales; no guarda formularios ni crea reservas. */
import assert from "node:assert/strict";
import { chromium, type Page } from "@playwright/test";
const origin = process.env.CARLA_BASE_URL || "http://localhost:3000";
const publico =
  process.env.CARLA_SITIO_URL || `${origin}/sitio/carla-cicero-demo`;
async function verificar() {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const errores: string[] = [];
      page.on("pageerror", (error) => errores.push(error.message));
      // Detiene recursos secundarios para demostrar que el contenido no espera window.load.
      await page.route("**/*", async (route) => {
        if (["image", "font"].includes(route.request().resourceType())) {
          await new Promise((resolve) => setTimeout(resolve, 8000));
          await route.abort().catch(() => {});
        } else if (
          route.request().resourceType() === "document" &&
          new URL(route.request().url()).hostname !== new URL(publico).hostname
        ) {
          await route.abort();
        } else await route.continue();
      });
      await page.goto(publico, { waitUntil: "domcontentloaded" });
      await page.locator(".publico-sitio").waitFor();
      const bloqueada = await page
        .locator(".carga-contenido")
        .getAttribute("aria-busy");
      if (process.argv.includes("--diagnosticar")) {
        console.log(
          JSON.stringify({
            width,
            contenidoBloqueado: bloqueada,
            loader: await page
              .locator('[data-testid="carga-aplicacion"]')
              .count(),
          }),
        );
        await context.close();
        continue;
      }
      assert.equal(
        bloqueada,
        "false",
        "La primera visita no debe esperar imágenes o fuentes",
      );
      assert.equal(
        await page.locator('[data-testid="carga-aplicacion"]').count(),
        0,
      );
      const catalogo = page.locator(".publico-seleccionar").first();
      await catalogo.click();
      assert.equal(
        await page.getByText("Agregar servicios", { exact: true }).count(),
        0,
      );
      assert.equal(await page.locator(".seleccion-quitar").count(), 1);
      await page.locator(".seleccion-quitar").click();
      assert.equal(await page.locator(".seleccion-quitar").count(), 0);
      const whatsapp = page.locator(".publico-whatsapp-flotante");
      if (await whatsapp.count()) {
        const contacto = page.locator('a[href^="https://wa.me/"]');
        const enlaces = await contacto.evaluateAll((items) =>
          items.map((item) => item.getAttribute("href")),
        );
        assert.equal(
          new Set(enlaces).size,
          1,
          "Contacto y flotante usan el mismo teléfono",
        );
        const caja = await whatsapp.boundingBox();
        assert.ok(caja && caja.x < width / 2);
      }
      await page.screenshot({ path: `test-results/sitio-frio-${width}.png` });
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(
        await page.locator(".carga-contenido").getAttribute("aria-busy"),
        "false",
      );
      assert.deepEqual(errores, []);
      await context.close();
      console.log(
        `Sitio frío, selección, recursos fallidos y recarga ${width}px OK`,
      );
    }
    if (process.argv.includes("--diagnosticar")) return;
    const password = process.env.CARLA_DEMO_PASSWORD;
    if (!password)
      throw new Error("Falta CARLA_DEMO_PASSWORD para verificar el panel.");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const login = await context.request.post(
      `${origin}/api/autenticacion/sign-in/email`,
      {
        headers: { Origin: origin },
        data: { email: "carla.demo@example.com", password },
      },
    );
    assert.ok(login.ok(), "Ingreso demo");
    const page: Page = await context.newPage();
    await page.goto(`${origin}/panel/equipo`, { waitUntil: "networkidle" });
    const estado = page
      .locator(".equipo-estado")
      .filter({ hasText: "Invitación pendiente" })
      .first();
    if (await estado.count()) {
      const texto = await estado.locator(":scope > span").boundingBox();
      const boton = await estado
        .getByRole("button", { name: "Cancelar invitación" })
        .boundingBox();
      assert.ok(
        texto &&
          boton &&
          Math.abs(texto.y + texto.height / 2 - boton.y - boton.height / 2) < 3,
      );
    }
    const editar = page
      .locator(".lista-equipo details")
      .filter({ has: page.locator('input[name="activo"]') })
      .first();
    await editar.locator("summary").click();
    const check = await editar.locator('input[name="activo"]').boundingBox();
    assert.ok(check && check.width <= 20 && check.height <= 20);
    const formulario = editar.locator(".formulario-flotante");
    assert.equal(
      await formulario.evaluate((e) => getComputedStyle(e).overscrollBehaviorY),
      "auto",
    );
    await page.screenshot({ path: "test-results/profesional-compacto.png" });
    await page.goto(`${origin}/panel/servicios`, { waitUntil: "networkidle" });
    await page.locator("summary").filter({ hasText: "Nuevo servicio" }).click();
    const fila = page.locator(".medio-pago-servicio").first();
    const entrada = await fila.locator("input").boundingBox();
    const unidad = await fila.locator("select").boundingBox();
    assert.ok(entrada && unidad && Math.abs(entrada.y - unidad.y) < 3);
    assert.equal(
      await fila
        .locator("select")
        .evaluate((e) => getComputedStyle(e).borderTopWidth),
      "0px",
    );
    await page.goto(`${origin}/panel/caja`, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".metrica-operativa").count(), 1);
    assert.equal(
      await page.getByText("Saldo del día", { exact: true }).count(),
      0,
    );
    await page.goto(`${origin}/panel/mi-sitio`, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".mini-whatsapp").count(), 0);
    // Navegación real desde el panel al sitio, sin recargar manualmente.
    const enlace = page
      .locator(`a[href^="${new URL(publico).origin}"]`)
      .first();
    assert.ok(await enlace.count(), "Mi sitio debe ofrecer el enlace público");
    if (await enlace.count()) {
      if ((await enlace.getAttribute("target")) === "_blank") {
        const nueva = context.waitForEvent("page");
        await enlace.click();
        const tab = await nueva;
        if (tab) {
          await tab.waitForLoadState("domcontentloaded");
          assert.equal(
            await tab.locator(".carga-contenido").getAttribute("aria-busy"),
            "false",
          );
        }
      } else {
        await enlace.click();
        await page.waitForURL((url) => url.origin === new URL(publico).origin);
        assert.equal(
          await page.locator(".carga-contenido").getAttribute("aria-busy"),
          "false",
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto(`${origin}/panel/servicios`, { waitUntil: "networkidle" });
    await page.locator("summary").filter({ hasText: "Nuevo servicio" }).click();
    const flotante = page.locator("details[open] .formulario-flotante").first();
    await flotante.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    const cajaFlotante = await flotante.boundingBox();
    assert.ok(cajaFlotante);
    const antes = await page.evaluate(() => window.scrollY);
    const puedeBajar = await page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        window.scrollY + window.innerHeight + 10,
    );
    if (puedeBajar) {
      await page.mouse.move(
        cajaFlotante.x + cajaFlotante.width / 2,
        Math.min(590, cajaFlotante.y + cajaFlotante.height - 20),
      );
      await page.mouse.wheel(0, 450);
      await page.waitForFunction(
        (posicion) => window.scrollY > posicion,
        antes,
      );
    }
    await page.screenshot({ path: "test-results/servicios-movil-scroll.png" });
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(
      desborde,
      false,
      "El formulario móvil no desborda horizontalmente",
    );
    await context.close();
    console.log(
      "Equipo, checkbox, medios, scroll, Caja y Mi sitio OK; sin guardar cambios.",
    );
  } finally {
    await browser.close();
  }
}
void verificar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
