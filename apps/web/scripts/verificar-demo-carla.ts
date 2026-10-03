/** Comprueba la cuenta demo en la web real sin modificar sus datos ni imprimir sesiones. */
import { chromium } from "@playwright/test";

async function verificar() {
  const password = process.env.CARLA_DEMO_PASSWORD;
  if (!password) throw new Error("Falta la contraseña de la demo a verificar.");
  const origin = "https://turnosrapidos.com.ar";
  const browser = await chromium.launch();
  try {
    for (const email of [
      "carla.demo@example.com",
      "lucia.carla.demo@example.com",
    ]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      try {
        const login = await context.request.post(
          `${origin}/api/autenticacion/sign-in/email`,
          {
            headers: { Origin: origin },
            data: { email, password },
          },
        );
        if (!login.ok())
          throw new Error(`Ingreso ${email}: HTTP ${login.status()}`);
        const page = await context.newPage();
        const rutas = email.startsWith("carla.")
          ? [
              "resumen",
              "agenda",
              "equipo",
              "inventario",
              "caja",
              "reportes",
              "mi-sitio",
            ]
          : ["resumen", "agenda", "clientes", "caja", "reportes", "mi-sitio"];
        for (const ruta of rutas) {
          const response = await page.goto(`${origin}/panel/${ruta}`, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          const texto = await page.locator("body").innerText();
          if (
            !response?.ok() ||
            !new URL(page.url()).pathname.startsWith("/panel/") ||
            /Application error:|server-side exception/.test(texto)
          )
            throw new Error(
              `Panel ${email} ${ruta}: respuesta inesperada ${response?.status()}`,
            );
          console.log(`${email}: ${ruta} OK`);
          if (
            ruta === "equipo" &&
            (!texto.includes("Cuenta vinculada") ||
              !texto.includes("Invitación pendiente"))
          )
            throw new Error("Equipo no muestra los dos estados esperados.");
        }
      } finally {
        await context.close();
      }
    }
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const response = await page.goto(
        "https://carla-cicero-demo.turnosrapidos.com.ar",
        { waitUntil: "networkidle", timeout: 60000 },
      );
      const texto = await page.locator("body").innerText();
      if (!response?.ok() || !texto.includes("Carla Cicero"))
        throw new Error("El sitio público no muestra el negocio.");
      const fallidas = await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter(
              (img) =>
                !(img as HTMLImageElement).complete ||
                !(img as HTMLImageElement).naturalWidth,
            )
            .map((img) => (img as HTMLImageElement).src),
        );
      if (fallidas.length)
        throw new Error(`Imágenes sin cargar: ${JSON.stringify(fallidas)}`);
      console.log("Sitio público e imágenes OK");
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
verificar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
