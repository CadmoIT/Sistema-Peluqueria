/** Comprueba el catálogo simplificado con una o varias personas y locales de la demo. */
import { PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures/panel-fixture";
process.loadEnvFile(".env.local");
const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());

test("Servicios sólo ofrece los campos pedidos y permite guardar, editar y publicar", async ({
  page,
}) => {
  const negocio = await db.negocio.findUniqueOrThrow({
    where: { slug: "estudio-aurora-demo" },
  });
  const nombre = "Servicio de prueba e2e";
  try {
    await page.goto("/panel/servicios");
    await expect(
      page.getByText("Definí qué ofrecés", { exact: false }),
    ).toHaveCount(0);
    await expect(page.locator(".avatar-cuadrado")).toHaveCount(0);
    await page.getByText("Nuevo servicio", { exact: true }).first().click();
    const formulario = page.locator(".formulario-servicio").first();
    await expect(
      formulario.locator("input:not([type=checkbox]):not([type=hidden])"),
    ).toHaveCount(5);
    await expect(formulario.locator("textarea")).toHaveCount(0);
    await expect(
      formulario.locator(
        "[name=imagen], [name=bufferMinutos], [name=descripcion]",
      ),
    ).toHaveCount(0);
    await expect(
      formulario.locator("input[name=profesionalIds][type=checkbox]"),
    ).toHaveCount(5);
    await expect(
      formulario.locator("input[name=sedeIds][type=checkbox]"),
    ).toHaveCount(2);
    await formulario.getByLabel("Nombre", { exact: true }).fill(nombre);
    await formulario
      .getByLabel("Categoría", { exact: true })
      .fill("Prueba e2e");
    await formulario.getByLabel("Precio", { exact: true }).fill("9900");
    await formulario
      .getByLabel("Duración (minutos)", { exact: true })
      .fill("45");
    await formulario.getByLabel("Seña (%)", { exact: true }).fill("20");
    await formulario.getByRole("button", { name: "Guardar servicio" }).click();
    const tarjeta = page.locator("article.tarjeta-listado").filter({
      has: page.getByRole("heading", { name: nombre, exact: true }),
    });
    await expect(tarjeta).toBeVisible();
    const servicio = await db.servicio.findFirstOrThrow({
      where: { negocioId: negocio.id, nombre },
      include: { profesionales: true, sedes: true },
    });
    expect(servicio.profesionales).toHaveLength(5);
    expect(servicio.sedes).toHaveLength(2);
    expect(Number(servicio.porcentajeSena)).toBe(20);
    await db.servicio.update({
      where: { id: servicio.id },
      data: {
        descripcion: "Texto anterior",
        imagen: "https://ejemplo.com/foto.jpg",
        bufferMinutos: 5,
      },
    });
    await tarjeta.locator("summary").click();
    const edicion = tarjeta.locator(".formulario-servicio");
    await edicion.getByLabel("Precio", { exact: true }).fill("12000");
    await edicion.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(tarjeta.locator(".servicio-fila__detalle")).toContainText("12.000");
    const guardado = await db.servicio.findUniqueOrThrow({
      where: { id: servicio.id },
    });
    expect(guardado.descripcion).toBe("Texto anterior");
    expect(guardado.imagen).toBe("https://ejemplo.com/foto.jpg");
    expect(guardado.bufferMinutos).toBe(5);
    await tarjeta.getByRole("button", { name: "Ocultar", exact: true }).click();
    await expect(
      tarjeta.getByRole("button", { name: "Publicar", exact: true }),
    ).toBeVisible();
    expect(
      (await db.servicio.findUniqueOrThrow({ where: { id: servicio.id } }))
        .activo,
    ).toBe(false);
    await tarjeta
      .getByRole("button", { name: "Publicar", exact: true })
      .click();
    await expect(
      tarjeta.getByRole("button", { name: "Ocultar", exact: true }),
    ).toBeVisible();
    await page.goto("/sitio/estudio-aurora-demo");
    await page.getByPlaceholder("Buscar un servicio").fill(nombre);
    await expect(
      page.getByRole("heading", { name: nombre, exact: true }),
    ).toBeVisible();
    await page.goto("/panel/servicios");
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByText("Nuevo servicio", { exact: true }).first().click();
      const campo = page
        .locator(".formulario-servicio")
        .first()
        .getByLabel("Nombre", { exact: true });
      await expect(campo).toBeVisible();
      const limites = (await campo.boundingBox())!;
      expect(limites.x).toBeGreaterThanOrEqual(0);
      expect(limites.x + limites.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: "test-results/servicios-desktop.png",
      fullPage: true,
    });
  } finally {
    await db.servicio.deleteMany({ where: { negocioId: negocio.id, nombre } });
    await db.categoriaServicio.deleteMany({
      where: { negocioId: negocio.id, nombre: "Prueba e2e" },
    });
  }
});

test("un único local y profesional se asignan sin mostrar campos adicionales", async ({
  page,
}) => {
  const negocio = await db.negocio.findUniqueOrThrow({
    where: { slug: "estudio-aurora-demo" },
  });
  const locales = await db.sede.findMany({
    where: { negocioId: negocio.id, activa: true },
    select: { id: true },
  });
  const personas = await db.profesional.findMany({
    where: { negocioId: negocio.id, activo: true },
    select: { id: true },
  });
  const nombre = "Servicio único e2e";
  try {
    await db.sede.updateMany({
      where: { id: { in: locales.slice(1).map(({ id }) => id) } },
      data: { activa: false },
    });
    await db.profesional.updateMany({
      where: { id: { in: personas.slice(1).map(({ id }) => id) } },
      data: { activo: false },
    });
    await page.goto("/panel/servicios");
    await page.getByText("Nuevo servicio", { exact: true }).first().click();
    const formulario = page.locator(".formulario-servicio").first();
    await expect(formulario.locator("fieldset")).toHaveCount(0);
    await formulario.getByLabel("Nombre", { exact: true }).fill(nombre);
    await formulario.getByLabel("Precio", { exact: true }).fill("5000");
    await formulario.getByRole("button", { name: "Guardar servicio" }).click();
    await expect(
      page.getByRole("heading", { name: nombre, exact: true }),
    ).toBeVisible();
    const servicio = await db.servicio.findFirstOrThrow({
      where: { negocioId: negocio.id, nombre },
      include: { profesionales: true, sedes: true },
    });
    expect(
      servicio.profesionales.map(({ profesionalId }) => profesionalId),
    ).toEqual([personas[0]!.id]);
    expect(servicio.sedes.map(({ sedeId }) => sedeId)).toEqual([
      locales[0]!.id,
    ]);
  } finally {
    await db.sede.updateMany({
      where: { id: { in: locales.map(({ id }) => id) } },
      data: { activa: true },
    });
    await db.profesional.updateMany({
      where: { id: { in: personas.map(({ id }) => id) } },
      data: { activo: true },
    });
    await db.servicio.deleteMany({ where: { negocioId: negocio.id, nombre } });
  }
});
