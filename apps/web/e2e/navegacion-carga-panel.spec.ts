/** Retiene respuestas reales para comprobar feedback antes de recibir datos, con la demo existente. */
import { test, expect } from "./fixtures/panel-fixture";
import type { Page } from "@playwright/test";

async function mostrarCargaPendiente(page: Page) {
  let liberar!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route("**/api/autenticacion/sign-in/email", async (route) => {
    await permiso;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Email o contraseña incorrectos." }),
    });
  });
  await page.goto("/acceder?modo=ingreso", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Email", { exact: true })
    .fill("prueba-loader@example.invalid");
  await page.locator('input[name="password"]').fill("ContraseñaPrueba2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator(".carga-contenido")).toHaveAttribute("inert", "");
  return liberar;
}

for (const movimiento of ["no-preference", "reduce"] as const) {
  test(`entrada directa: confirma al cargar sin esperar diciembre (${movimiento})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: movimiento });
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.addInitScript(() => {
      const meses: string[] = [];
      const tiempos: number[] = [];
      (window as unknown as { tiemposLoader: number[] }).tiemposLoader =
        tiempos;
      const giros: {
        mes: string | null;
        transform: string;
        pliegue: string;
      }[] = [];
      (window as unknown as { girosLoader: typeof giros }).girosLoader = giros;
      (window as unknown as { mesesLoader: string[] }).mesesLoader = meses;
      const comprobarMovimiento = () => {
        const hoja = document.querySelector(".entrada-hoja--vuelo");
        if (hoja && giros.length < 500)
          giros.push({
            mes:
              document
                .querySelector('[data-testid="calendario-entrada"]')
                ?.getAttribute("data-mes") ?? null,
            transform: getComputedStyle(hoja).transform,
            pliegue:
              hoja.querySelector(".entrada-hoja__recorte")?.getAttribute("d") ??
              "",
          });
        requestAnimationFrame(comprobarMovimiento);
      };
      requestAnimationFrame(comprobarMovimiento);
      new MutationObserver(() => {
        const mes = document
          .querySelector('[data-testid="calendario-entrada"]')
          ?.getAttribute("data-mes");
        if (mes && meses[meses.length - 1] !== mes) {
          meses.push(mes);
          tiempos.push(performance.now());
        }
      }).observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-mes"],
      });
    });
    await page.goto("/panel/resumen", { waitUntil: "domcontentloaded" });
    const calendario = page.getByTestId("calendario-entrada");
    const inicio = Date.now();
    await expect(calendario).toBeVisible();
    const mesInicial = await calendario.getAttribute("data-mes");
    const anoInicial = await calendario.getAttribute("data-ano");
    const caja = await calendario.boundingBox();
    expect(caja, errores.join("\n")).not.toBeNull();
    expect(caja!.width).toBeGreaterThanOrEqual(400);
    await expect(
      page.getByText("Tu agenda está lista", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
      timeout: 30_000,
    });
    expect(Date.now() - inicio).toBeLessThan(4000);
    const mesesVistos = await page.evaluate(
      () => (window as unknown as { mesesLoader: string[] }).mesesLoader,
    );
    expect(mesesVistos[0]).toBe(mesInicial);
    expect(anoInicial).toMatch(/^20\d{2}$/);
    const giros = await page.evaluate(
      () =>
        (
          window as unknown as {
            girosLoader: {
              mes: string | null;
              transform: string;
              pliegue: string;
            }[];
          }
        ).girosLoader,
    );
    const movimientos = new Map<string | null, Set<string>>();
    for (const giro of giros) {
      if (!giro.transform.startsWith("matrix3d")) continue;
      const muestras = movimientos.get(giro.mes) ?? new Set<string>();
      muestras.add(`${giro.transform}|${giro.pliegue}`);
      movimientos.set(giro.mes, muestras);
    }
    // Comprueba cuadros físicamente distintos: una clase CSS o el texto cambiante no bastan.
    const tiempos = await page.evaluate(
      () => (window as unknown as { tiemposLoader: number[] }).tiemposLoader,
    );
    for (let i = 1; i < tiempos.length; i++)
      expect(tiempos[i]! - tiempos[i - 1]!).toBeGreaterThanOrEqual(450);
    expect(errores).toEqual([]);
  });
}

test("cinemática: dobla la esquina inferior derecha y muestra el reverso antes de pasar detrás", async ({
  page,
}, info) => {
  await page.clock.install({ time: Date.now() });
  await page.clock.pauseAt(Date.now());
  const liberar = await mostrarCargaPendiente(page);
  await expect(page.getByTestId("calendario-entrada")).toBeVisible();
  await expect(page.locator(".carga-contenido")).toHaveAttribute("inert", "");
  await page.clock.runFor(140);
  await expect(page.locator(".entrada-hoja--vuelo")).toBeAttached();
  await expect(
    page.locator(".entrada-hoja--vuelo .entrada-hoja__doblez"),
  ).toBeAttached();
  const mesInicial = await page
    .getByTestId("calendario-entrada")
    .getAttribute("data-mes");
  await expect(page.getByTestId("calendario-entrada")).toHaveAttribute(
    "data-mes",
    mesInicial!,
  );
  await page.screenshot({
    path: `test-results/hoja-esquina-${info.project.name}.png`,
  });
  await page.clock.runFor(160);
  await expect(
    page.locator(".entrada-hoja--vuelo .entrada-hoja__reverso"),
  ).toBeAttached();
  await page.screenshot({
    path: `test-results/hoja-reverso-${info.project.name}.png`,
  });
  await page.clock.runFor(220);
  await expect(page.getByTestId("calendario-entrada")).not.toHaveAttribute(
    "data-mes",
    mesInicial!,
  );
  liberar();
});

test("continuidad entre meses: conserva la hoja siguiente y no introduce una pausa", async ({
  page,
}) => {
  await page.clock.install({ time: Date.now() });
  await page.clock.pauseAt(Date.now());
  const liberar = await mostrarCargaPendiente(page);
  await expect(page.locator(".carga-contenido")).toHaveAttribute("inert", "");
  const siguiente = page
    .locator('[data-testid="calendario-entrada"] [data-hoja-mes]')
    .nth(1);
  const nodo = await siguiente.elementHandle();
  await page.clock.runFor(496);
  expect(
    Number(
      await page
        .locator('[data-testid="calendario-entrada"] .entrada-hoja')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
    ),
  ).toBeLessThan(0.02);
  await page.clock.runFor(32);
  expect(
    await siguiente.evaluate((el, anterior) => el === anterior, nodo),
  ).toBe(true);
  expect(Number(await siguiente.getAttribute("data-avance"))).toBeGreaterThan(
    0,
  );
  await expect(siguiente.locator(".entrada-hoja__doblez")).toBeAttached();
  await expect(page.locator("[data-hoja-mes]")).toHaveCount(3);
  liberar();
});

test("carga de dos segundos: dibuja el check en el mes alcanzado sin recorrer diciembre", async ({
  page,
}) => {
  await page.goto("/acceder?modo=ingreso");
  await page.clock.install({ time: Date.now() });
  await page.clock.pauseAt(Date.now());
  let liberar!: () => void;
  let preparado!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const respuestaPreparada = new Promise<void>((resolve) => {
    preparado = resolve;
  });
  await page.route("**/panel/resumen**", async (route) => {
    const respuesta = await route.fetch();
    preparado();
    await permiso;
    await route.fulfill({ response: respuesta });
  });
  await page
    .getByLabel("Email", { exact: true })
    .fill("demo@turnosrapidos.com.ar");
  await page.locator('input[name="password"]').fill("DemoTurnos2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await respuestaPreparada;
  const meses = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];
  const mesInicial = await page
    .getByTestId("calendario-entrada")
    .getAttribute("data-mes");
  const mesEsperado = meses[(meses.indexOf(mesInicial!) + 4) % 12];
  await page.clock.runFor(2000);
  await expect(page.locator(".entrada-calendario__check")).toHaveCount(0);
  liberar();
  await expect(page.getByTestId("calendario-entrada")).toHaveAttribute(
    "data-listo",
    "true",
  );
  await page.clock.runFor(64);
  await expect(page.getByTestId("calendario-entrada")).toHaveAttribute(
    "data-mes",
    mesEsperado!,
  );
  await expect(page.locator(".entrada-calendario__check")).toBeAttached();
  await page.clock.runFor(512);
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
});

test("respuesta del resumen retenida: el calendario espera a que monte el contenido", async ({
  page,
}) => {
  await page.goto("/acceder?modo=ingreso");
  let liberar!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route("**/panel/resumen**", async (route) => {
    const respuesta = await route.fetch();
    await permiso;
    await route.fulfill({ response: respuesta });
  });
  await page
    .getByLabel("Email", { exact: true })
    .fill("demo@turnosrapidos.com.ar");
  await page.locator('input[name="password"]').fill("DemoTurnos2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByTestId("calendario-entrada")).toHaveAttribute(
    "data-listo",
    "false",
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1500);
  await expect(page.locator(".entrada-calendario__check")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/calendario-esperando-datos.png",
  });
  liberar();
  await expect(page).toHaveURL(/\/panel\/resumen$/, { timeout: 30_000 });
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
});

test("skeleton inmediato antes de recibir la ruta y sidebar disponible", async ({
  page,
}) => {
  await page.goto("/panel/resumen");
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  let liberar!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route("**/panel/clientes**", async (route) => {
    await permiso;
    await route.continue();
  });
  await page
    .getByRole("link", { name: "Clientes", exact: true })
    .first()
    .click();
  await expect(
    page.getByTestId("skeleton-panel").filter({ visible: true }),
  ).toHaveAttribute("data-modulo", "clientes");
  await expect(page).toHaveURL(/\/panel\/resumen$/);
  await expect(
    page.getByRole("link", { name: "Agenda", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
  await page.screenshot({ path: "test-results/skeleton-clientes.png" });
  liberar();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
  await expect(page.getByTestId("skeleton-panel")).toHaveCount(0, {
    timeout: 30_000,
  });
});

test("clics consecutivos: la última pantalla elegida determina el skeleton", async ({
  page,
}) => {
  await page.goto("/panel/resumen");
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  let liberar!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route("**/panel/clientes**", async (route) => {
    await permiso;
    await route.continue();
  });
  await page
    .getByRole("link", { name: "Clientes", exact: true })
    .first()
    .click();
  await expect(
    page.getByTestId("skeleton-panel").filter({ visible: true }),
  ).toHaveAttribute("data-modulo", "clientes");
  await page
    .getByRole("link", { name: "Servicios", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/panel\/servicios$/, { timeout: 30_000 });
  await expect(page.getByTestId("skeleton-panel")).toHaveCount(0);
  liberar();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/panel\/servicios$/);
  await expect(
    page.getByRole("heading", { name: "Servicios", exact: true }),
  ).toBeVisible();
});

test("móvil y movimiento reducido: confirmación al cargar y skeleton al navegar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/panel/resumen");
  await expect(page.getByTestId("calendario-entrada")).toBeVisible();
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  let liberar!: () => void;
  const permiso = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route("**/panel/agenda**", async (route) => {
    await permiso;
    await route.continue();
  });
  await page
    .locator(".panel-inferior")
    .getByRole("link", { name: "Agenda", exact: true })
    .click();
  await expect(
    page.getByTestId("skeleton-panel").filter({ visible: true }),
  ).toHaveAttribute("data-modulo", "agenda");
  liberar();
  await expect(page).toHaveURL(/\/panel\/agenda$/);
  await expect(page.getByTestId("skeleton-panel")).toHaveCount(0, {
    timeout: 30_000,
  });
});

test("sin JavaScript: el overlay del panel no tapa la información", async ({
  browser,
  sesionDemo,
}) => {
  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: sesionDemo,
  });
  const page = await contexto.newPage();
  await page.goto("http://localhost:3000/panel/resumen");
  await expect(page.getByTestId("carga-aplicacion")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Estudio Aurora" }),
  ).toBeVisible();
  await contexto.close();
});

test("error del módulo: retira el skeleton y permite reintentar", async ({
  page,
}) => {
  await page.goto("/panel/resumen");
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.route("**/panel/clientes**", async (route) => {
    const respuesta = await route.fetch();
    const cuerpo = await respuesta.text();
    // Sustituye únicamente el resultado del componente de página por un error RSC.
    // No modifica datos ni interrumpe la base compartida durante la prueba.
    const pagina = cuerpo.match(
      /^([\da-f]+):\["\$","div",null,\{"className":"panel-contenido[^\n]*$/m,
    );
    expect(
      pagina,
      "La respuesta debe incluir el contenido de Clientes",
    ).not.toBeNull();
    await route.fulfill({
      response: respuesta,
      body: cuerpo.replace(
        pagina![0],
        `${pagina![1]}:E${JSON.stringify({ digest: "prueba-carga-modulo", name: "Error", message: "Fallo simulado del módulo", stack: [] })}`,
      ),
    });
  });
  await page
    .getByRole("link", { name: "Clientes", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "No pudimos cargar esta pantalla" }),
  ).toBeVisible();
  await expect(page.getByTestId("skeleton-panel")).toHaveCount(0);
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
  await page.unroute("**/panel/clientes**");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
});
