/** Comprueba el ciclo automático de ocho rubros y sus transiciones de desplazamiento y fade. */
import { expect, test } from "@playwright/test";

test("las fotos atraviesan posiciones intermedias con fade, incluso con movimiento reducido", async ({
  page,
}) => {
  for (const movimiento of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion: movimiento });
    await page.goto("/");
    await expect(page.locator(".hero-carrusel")).toHaveAttribute(
      "data-listo",
      "true",
    );
    const foto = page.getByRole("button", {
      name: "Ver Veterinaria",
      exact: true,
    });
    const inicial = await foto.evaluate(
      (elemento) => new DOMMatrix(getComputedStyle(elemento).transform).m41,
    );
    await page
      .getByRole("button", { name: "Ver Manicuría", exact: true })
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(foto).toHaveAttribute("data-posicion", "0");
    const recorrido = await foto.evaluate((elemento) => {
      const animacion = elemento
        .getAnimations()
        .find(
          (animacion) =>
            animacion instanceof CSSTransition &&
            animacion.transitionProperty === "transform",
        );
      if (!animacion)
        throw new Error(
          "La foto debe tener una transición de desplazamiento real",
        );
      animacion.pause();
      animacion.currentTime = 700;
      const intermedio = new DOMMatrix(getComputedStyle(elemento).transform)
        .m41;
      const opacidad = getComputedStyle(elemento).opacity;
      animacion.currentTime = 1400;
      const final = new DOMMatrix(getComputedStyle(elemento).transform).m41;
      return { intermedio, final, opacidad };
    });
    expect(recorrido.intermedio).toBeLessThan(inicial);
    expect(recorrido.intermedio).toBeGreaterThan(recorrido.final);
    expect(recorrido.opacidad).toBe("1");
  }
});

test("el carrusel avanza cada seis segundos en el orden solicitado y vuelve al inicio", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".hero-carrusel")).toHaveAttribute(
    "data-listo",
    "true",
  );
  const centro = page.locator('.hero-carrusel__foto[data-posicion="0"]');
  await expect(centro).toHaveAttribute("aria-label", "Ver Manicuría");
  const orden = [
    "Veterinaria",
    "Tatuajes",
    "Masajista",
    "Barbería",
    "Consultorio",
    "Peluquería",
    "Pádel",
    "Manicuría",
  ];
  for (const nombre of orden) {
    await page.clock.runFor(6001);
    await expect(centro).toHaveAttribute("aria-label", `Ver ${nombre}`);
  }
  await expect(
    page.locator(
      ".hero-carrusel__controles, .hero-carrusel__indicadores, .hero-carrusel__nombre",
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Foto anterior" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Foto siguiente" }),
  ).toHaveCount(0);
});

test("las fotos laterales se pueden centrar sin botones de navegación", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero-carrusel")).toHaveAttribute(
    "data-listo",
    "true",
  );
  const lateral = page.locator('.hero-carrusel__foto[data-posicion="1"]');
  const borde = await lateral.boundingBox();
  await lateral.click({
    position: { x: borde!.width * 0.8, y: borde!.height / 2 },
  });
  await expect(
    page.locator('.hero-carrusel__foto[data-posicion="0"]'),
  ).toHaveAttribute("aria-label", "Ver Veterinaria");
  await page
    .getByRole("button", { name: "Ver Veterinaria", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator('.hero-carrusel__foto[data-posicion="0"]'),
  ).toHaveAttribute("aria-label", "Ver Tatuajes");
  // Ni mantener el foco ni pedir menos animación en el sistema debe detener el avance.
  await page.clock.runFor(6001);
  await expect(
    page.locator('.hero-carrusel__foto[data-posicion="0"]'),
  ).toHaveAttribute("aria-label", "Ver Masajista");
});

test("conserva cinco fotos visibles, profundidad y ancho correcto en escritorio y móvil", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const ancho of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width: ancho, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".hero-carrusel__foto")).toHaveCount(8);
    await expect(
      page.locator('.hero-carrusel__foto:not([aria-hidden="true"])'),
    ).toHaveCount(5);
    const centro = await page
      .locator('.hero-carrusel__foto[data-posicion="0"]')
      .boundingBox();
    const lateral = await page
      .locator('.hero-carrusel__foto[data-posicion="1"]')
      .boundingBox();
    const fondo = await page
      .locator('.hero-carrusel__foto[data-posicion="2"]')
      .boundingBox();
    expect(centro!.width).toBeGreaterThan(lateral!.width);
    expect(lateral!.width).toBeGreaterThan(fondo!.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(ancho);
    await expect(page.locator(".hero-fotografico__cta")).toHaveAttribute(
      "href",
      "/acceder?modo=registro",
    );
    await expect
      .poll(() =>
        page
          .locator('.hero-carrusel__foto[data-posicion="0"] img')
          .evaluate((imagen) => (imagen as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath(`hero-${ancho}.png`) });
  }
});
