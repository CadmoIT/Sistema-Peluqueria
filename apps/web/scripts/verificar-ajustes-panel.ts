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
    await page.getByText("Nuevo servicio", { exact: true }).click();
    await page.locator('input[name="precio"]').first().fill("10000");
    await page
      .getByRole("combobox", { name: "Ajuste Mercado Pago", exact: true })
      .selectOption("RECARGO");
    await page
      .getByRole("spinbutton", { name: "Valor Mercado Pago", exact: true })
      .fill("10");
    const texto = await page
      .locator(".medios-pago-servicio")
      .first()
      .innerText();
    if (!texto.includes("11.000"))
      throw new Error("La vista previa no aplica el recargo.");
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
    await page.goto(`${origin}/sitio/carla-cicero-demo`, {
      waitUntil: "networkidle",
    });
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
