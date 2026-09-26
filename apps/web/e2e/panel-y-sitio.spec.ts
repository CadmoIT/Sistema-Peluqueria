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
  await page
    .getByPlaceholder("Buscar un servicio (ej. corte, uñas,masaje...)")
    .fill("corte");
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

test("el buscador orienta qué servicios se pueden buscar", async ({ page }) => {
  const placeholder = "Buscar un servicio (ej. corte, uñas,masaje...)";
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/sitio/estudio-aurora-demo");
  await expect(page.locator(".publico-buscador input")).toHaveAttribute(
    "placeholder",
    placeholder,
  );
  const direccionPublica = page.locator(".publico-identidad__direccion");
  await expect(direccionPublica).toHaveAttribute("href", /google\.com\/maps/);
  await expect(page.getByText("Abrir en Google Maps")).toHaveCount(0);
  const categoriasPublicas = await page
    .locator(".publico-categorias details > summary strong")
    .allTextContents();

  await page.goto("/panel/mi-sitio");
  await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0, {
    timeout: 30_000,
  });
  const buscadorBorrador = page.locator(
    ".editor-preview__sitio .publico-buscador input",
  );
  await expect(buscadorBorrador).toHaveAttribute("placeholder", placeholder);
  await expect(buscadorBorrador).not.toHaveAttribute("readonly", "");
  await expect(
    page.locator(".editor-preview__sitio .publico-identidad__direccion"),
  ).toHaveAttribute("href", /google\.com\/maps/);
  await expect(
    page.locator(".editor-preview__sitio .publico-categorias details > summary strong"),
  ).toHaveText(categoriasPublicas);
  const presentacionBorrador = await page
    .locator(".editor-preview__sitio .publico-identidad__encabezado p")
    .boundingBox();
  const tituloCatalogoBorrador = await page
    .locator(".editor-preview__sitio .publico-titulo h2")
    .boundingBox();
  const tarjetaBorrador = await page
    .locator(".editor-preview__sitio .publico-identidad__tarjeta")
    .boundingBox();
  const catalogoBorrador = await page
    .locator(".editor-preview__sitio .publico-experiencia")
    .boundingBox();
  expect(presentacionBorrador).not.toBeNull();
  expect(tituloCatalogoBorrador).not.toBeNull();
  expect(tarjetaBorrador).not.toBeNull();
  expect(catalogoBorrador).not.toBeNull();
  expect(
    tituloCatalogoBorrador!.y -
      (presentacionBorrador!.y + presentacionBorrador!.height),
  ).toBeLessThan(40);
  expect(tituloCatalogoBorrador!.y).toBeLessThan(
    tarjetaBorrador!.y + tarjetaBorrador!.height,
  );
  expect(catalogoBorrador!.x + catalogoBorrador!.width).toBeLessThanOrEqual(
    tarjetaBorrador!.x,
  );
  await page.getByLabel("Nombre visible").fill("Estudio Aurora en borrador");
  await expect(
    page.locator(".editor-preview__sitio .publico-identidad__encabezado h2"),
  ).toHaveText("Estudio Aurora en borrador");
  await page.screenshot({ path: "test-results/borrador-sitio-alineado.png" });

  const selectorLocal = page.getByRole("combobox", { name: "Local" });
  const opcionesLocal = await selectorLocal.locator("option").all();
  if (opcionesLocal.length > 1) {
    const opcion = opcionesLocal[1]!;
    const idLocal = await opcion.getAttribute("value");
    const nombreLocal = (await opcion.textContent())?.trim();
    if (idLocal && nombreLocal) {
      await selectorLocal.selectOption(idLocal);
      await expect(page).toHaveURL(new RegExp(`[?&]local=${idLocal}`));
      await expect(
        page.locator(".editor-preview__sitio .publico-titulo h2"),
      ).toBeVisible();
      await expect(
        page.locator(".editor-preview__sitio .publico-identidad__tarjeta"),
      ).toHaveAttribute("aria-label", `Información de ${nombreLocal}`);
    }
  }
});

test("los profesionales se elevan al pasar el mouse y vuelven al salir", async ({
  page,
}) => {
  await page.goto("/sitio/estudio-aurora-demo");

  const avatar = page.locator(".publico-identidad__profesional").first();
  await expect(avatar).toBeVisible();
  const posicionInicial = await avatar.boundingBox();
  expect(posicionInicial).not.toBeNull();

  await avatar.hover();
  await expect(avatar.locator(".publico-identidad__profesional-tooltip")).toBeVisible();
  await expect
    .poll(async () => {
      const posicion = await avatar.boundingBox();
      return posicionInicial!.y - (posicion?.y ?? posicionInicial!.y);
    })
    .toBeGreaterThan(8);
  await page.screenshot({ path: "test-results/profesionales-hover.png" });

  await page.mouse.move(0, 0);
  await expect(avatar.locator(".publico-identidad__profesional-tooltip")).toHaveCount(0);
  await expect
    .poll(async () => {
      const posicion = await avatar.boundingBox();
      return Math.abs((posicion?.y ?? posicionInicial!.y) - posicionInicial!.y);
    })
    .toBeLessThan(2);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const posicionReducidaInicial = await avatar.boundingBox();
  expect(posicionReducidaInicial).not.toBeNull();
  await avatar.hover();
  await expect
    .poll(async () => {
      const posicion = await avatar.boundingBox();
      return posicionReducidaInicial!.y - (posicion?.y ?? posicionReducidaInicial!.y);
    })
    .toBeGreaterThan(5);
});

test("las muestras de color crecen al pasar el mouse y las etiquetas se leen", async ({
  page,
}) => {
  await page.goto("/panel/mi-sitio");
  const selector = page.locator(".selector-color").first();
  const etiqueta = selector.locator("summary span");
  const circulo = selector.locator("summary i");
  await expect(etiqueta).toHaveCSS("font-size", "13px");

  const posicionInicial = await circulo.boundingBox();
  expect(posicionInicial).not.toBeNull();
  await circulo.hover();
  await expect
    .poll(async () => {
      const posicion = await circulo.boundingBox();
      return posicionInicial!.y - (posicion?.y ?? posicionInicial!.y);
    })
    .toBeGreaterThan(3);
});

test("los controles de categoría tienen un área más visible y margen al borde", async ({
  page,
}) => {
  await page.goto("/sitio/estudio-aurora-demo");
  const categoria = page.locator(".publico-categorias details").first();
  const control = categoria.locator("summary > span");
  await expect(control).toHaveCSS("font-size", "26px");
  const cajaCategoria = await categoria.boundingBox();
  const cajaControl = await control.boundingBox();
  expect(cajaCategoria).not.toBeNull();
  expect(cajaControl).not.toBeNull();
  expect(cajaCategoria!.x + cajaCategoria!.width - cajaControl!.x - cajaControl!.width)
    .toBeGreaterThanOrEqual(12);
});

test("el menú del perfil se anima y conserva el avatar quieto", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/panel/resumen");
  await expect(
    page.getByRole("heading", { name: "Estudio Aurora" }),
  ).toBeVisible();
  const menu = page.locator(".panel-cuenta-flotante .panel-cuenta");
  const activador = menu.locator(":scope > summary");
  const avatar = activador.locator(".panel-cuenta__avatar");
  await activador.click();

  await expect(menu).toHaveAttribute("open", "");
  await expect(menu.locator(".panel-cuenta__menu")).toHaveCSS(
    "border-radius",
    "20px",
  );
  await expect(menu.locator(".panel-cuenta__menu")).toHaveCSS(
    "animation-name",
    "panel-cuenta-menu-entrada",
  );
  await expect(avatar).toHaveCSS("animation-name", "none");
  await expect(avatar).toHaveCSS("transform", "none");
  const recorridoVertical = await menu
    .locator(".panel-cuenta__menu")
    .evaluate(async (element) => {
      const valores: number[] = [];
      const inicio = performance.now();
      return new Promise<number[]>((resolver) => {
        function observar(momento: number) {
          const transformacion = getComputedStyle(element).transform;
          valores.push(
            transformacion === "none"
              ? 0
              : new DOMMatrixReadOnly(transformacion).m42,
          );
          if (momento - inicio >= 280) resolver(valores);
          else requestAnimationFrame(observar);
        }
        requestAnimationFrame(observar);
      });
    });
  expect(recorridoVertical.length).toBeGreaterThan(5);
  expect(Math.min(...recorridoVertical)).toBeLessThan(-1);
  expect(Math.abs(recorridoVertical.at(-1) ?? 100)).toBeLessThan(0.5);

  await activador.click();
  await expect(menu).not.toHaveAttribute("open", "");
  await activador.click();
  await expect(menu).toHaveAttribute("open", "");
  const recorridoAlReabrir = await menu
    .locator(".panel-cuenta__menu")
    .evaluate(async (element) => {
      const valores: number[] = [];
      const inicio = performance.now();
      return new Promise<number[]>((resolver) => {
        function observar(momento: number) {
          const transformacion = getComputedStyle(element).transform;
          valores.push(
            transformacion === "none"
              ? 0
              : new DOMMatrixReadOnly(transformacion).m42,
          );
          if (momento - inicio >= 280) resolver(valores);
          else requestAnimationFrame(observar);
        }
        requestAnimationFrame(observar);
      });
    });
  expect(Math.min(...recorridoAlReabrir)).toBeLessThan(-1);
  expect(Math.abs(recorridoAlReabrir.at(-1) ?? 100)).toBeLessThan(0.5);
  await page.screenshot({ path: "test-results/menu-perfil-abierto.png" });
});

test("el menú conserva una entrada corta con movimiento reducido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/panel/resumen");
  const menu = page.locator(".panel-cuenta-flotante .panel-cuenta");
  await menu.locator(":scope > summary").click();

  const contenido = menu.locator(".panel-cuenta__menu");
  await expect(contenido).toHaveCSS(
    "animation-name",
    "panel-cuenta-menu-entrada-reducida",
  );
  await expect(contenido).toHaveCSS("animation-duration", "0.16s");
  const recorrido = await contenido.evaluate(async (element) => {
    const valores: number[] = [];
    const inicio = performance.now();
    return new Promise<number[]>((resolver) => {
      function observar(momento: number) {
        const transformacion = getComputedStyle(element).transform;
        valores.push(
          transformacion === "none"
            ? 0
            : new DOMMatrixReadOnly(transformacion).m42,
        );
        if (momento - inicio >= 190) resolver(valores);
        else requestAnimationFrame(observar);
      }
      requestAnimationFrame(observar);
    });
  });
  expect(Math.min(...recorrido)).toBeLessThan(-1);
  expect(Math.abs(recorrido.at(-1) ?? 100)).toBeLessThan(0.5);
});

test("ver horario abre un menú redondeado al pasar el mouse", async ({ page }) => {
  await page.goto("/sitio/estudio-aurora-demo");
  const horario = page.locator(".publico-horarios").first();
  const menu = horario.locator('[role="tooltip"]');
  await horario.hover();

  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("border-radius", "18px");
  await expect(menu).toContainText("Horarios de atención");
  await expect(menu.locator("a, button")).toHaveCount(0);
});

test("el catálogo queda cerca de la presentación del local", async ({ page }) => {
  await page.goto("/sitio/estudio-aurora-demo");
  const identidad = page.locator(".publico-identidad");
  const tituloCatalogo = page.locator(".publico-experiencia h2");
  await expect(tituloCatalogo).toBeVisible();
  const cajaIdentidad = await identidad.boundingBox();
  const cajaTitulo = await tituloCatalogo.boundingBox();
  expect(cajaIdentidad).not.toBeNull();
  expect(cajaTitulo).not.toBeNull();
  expect(cajaTitulo!.y - (cajaIdentidad!.y + cajaIdentidad!.height)).toBeLessThan(6);

  await page.evaluate(() => {
    const encabezado = document.querySelector(".publico-identidad__encabezado");
    if (!encabezado) return;
    const logo = document.createElement("img");
    logo.className = "publico-identidad__logo";
    logo.alt = "";
    logo.src =
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"><rect width="140" height="140" rx="20" fill="#111827"/><text x="70" y="84" fill="white" font-size="42" text-anchor="middle">EA</text></svg>',
      );
    encabezado.prepend(logo);
  });
  const logo = page.locator(".publico-identidad__logo");
  await expect(logo).toBeVisible();
  const cajaLogo = await logo.boundingBox();
  const cajaTextoMarca = await page
    .locator(".publico-identidad__encabezado > div")
    .boundingBox();
  const cajaMarca = await page.locator(".publico-identidad__encabezado h2").boundingBox();
  const cajaIdentidadConLogo = await identidad.boundingBox();
  const cajaCatalogoConLogo = await tituloCatalogo.boundingBox();
  expect(cajaLogo).not.toBeNull();
  expect(cajaTextoMarca).not.toBeNull();
  expect(cajaMarca).not.toBeNull();
  expect(cajaIdentidadConLogo).not.toBeNull();
  expect(cajaCatalogoConLogo).not.toBeNull();
  expect(cajaMarca!.x).toBeGreaterThan(cajaLogo!.x + cajaLogo!.width);
  expect(
    Math.abs(
      cajaTextoMarca!.y + cajaTextoMarca!.height / 2 -
        (cajaLogo!.y + cajaLogo!.height / 2),
    ),
  ).toBeLessThan(2);
  expect(cajaCatalogoConLogo!.y).toBeGreaterThanOrEqual(
    cajaIdentidadConLogo!.y + cajaIdentidadConLogo!.height,
  );
  expect(
    cajaCatalogoConLogo!.y -
      (cajaIdentidadConLogo!.y + cajaIdentidadConLogo!.height),
  ).toBeLessThan(6);
  await page.screenshot({ path: "test-results/catalogo-cerca-con-logo.png" });
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
