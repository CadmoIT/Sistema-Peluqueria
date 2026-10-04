/** Verifica presentación y cálculos del panel sin guardar formularios ni modificar la demo. */
import { chromium } from "@playwright/test";
async function verificar() {
  const origin = process.env.CARLA_BASE_URL || "http://localhost:3000";
  const password = process.env.CARLA_DEMO_PASSWORD;
  if (!password) throw new Error("Falta CARLA_DEMO_PASSWORD.");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const login = await context.request.post(
      `${origin}/api/autenticacion/sign-in/email`,
      {
        headers: { Origin: origin },
        data: { email: "carla.demo@example.com", password },
      },
    );
    if (!login.ok()) throw new Error(`Ingreso: ${login.status()}`);
    const page = await context.newPage();
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(`${origin}/panel/servicios`, { waitUntil: "networkidle" });
    await page.locator("summary").filter({ hasText: "Nuevo servicio" }).click();
    await page.locator('input[name="precio"]').first().fill("10000");
    await page
      .getByRole("textbox", { name: "Ajuste Mercado Pago", exact: true })
      .fill("+10");
    const reglas = JSON.parse(
      await page.locator('input[name="mediosPago"]').first().inputValue(),
    );
    if (
      reglas.MERCADO_PAGO.tipo !== "RECARGO" ||
      reglas.MERCADO_PAGO.valor !== 10
    )
      throw new Error("El ajuste firmado no aplica el recargo.");
    await page
      .getByRole("textbox", { name: "Ajuste Efectivo", exact: true })
      .fill("-500");
    await page
      .getByRole("combobox", { name: "Unidad Efectivo", exact: true })
      .selectOption("PESOS");
    const reglasPesos = JSON.parse(
      await page.locator('input[name="mediosPago"]').first().inputValue(),
    );
    if (
      reglasPesos.EFECTIVO.unidad !== "PESOS" ||
      reglasPesos.EFECTIVO.valor !== 500
    )
      throw new Error("No conserva el descuento fijo.");
    await page.screenshot({ path: "test-results/ajustes-servicio.png" });
    await page.goto(`${origin}/panel/actividad`, { waitUntil: "networkidle" });
    if (
      (await page.locator('input[type="date"]').count()) !== 1 ||
      (await page.locator("select").count()) !== 1
    )
      throw new Error("Actividad no tiene exactamente Fecha y Persona.");
    await page.goto(`${origin}/panel/agenda`, { waitUntil: "networkidle" });
    const agenda = await page.locator(".agenda-principal").boundingBox();
    const lateral = await page.locator(".agenda-lateral").boundingBox();
    if (!agenda || !lateral || agenda.x >= lateral.x)
      throw new Error("Agenda no está a la izquierda.");
    await page.goto(
      process.env.CARLA_SITIO_URL || `${origin}/sitio/carla-cicero-demo`,
      {
        waitUntil: "networkidle",
      },
    );
    const avatar = page
      .locator("button.publico-identidad__profesional")
      .first();
    await avatar.hover();
    if (!(await page.getByRole("tooltip").isVisible()))
      throw new Error("El globo del profesional no aparece.");
    const esPortal = await page
      .getByRole("tooltip")
      .evaluate((e) => e.parentElement === document.body);
    if (!esPortal) throw new Error("El globo sigue dentro de la tarjeta.");
    await page.screenshot({ path: "test-results/ajustes-profesional.png" });
    if (errores.length) throw new Error(errores.join("; "));
    await context.close();
    console.log(
      "Formulario, recargo, Actividad, Agenda y globo del profesional OK; sin guardar datos.",
    );
  } finally {
    await browser.close();
  }
}
void verificar().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
