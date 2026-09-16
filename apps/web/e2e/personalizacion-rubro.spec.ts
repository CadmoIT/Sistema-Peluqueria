/** Comprueba la personalización y sus permisos usando sólo datos de prueba de la cuenta demo. */
import { PrismaClient, Prisma } from "@prisma/client";
import { expect, test } from "./fixtures/panel-fixture";
process.loadEnvFile(".env.local");
const db = new PrismaClient();
test.use({ actionTimeout: 15000 });
test.afterAll(async () => db.$disconnect());

async function demo() {
  return db.negocio.findUniqueOrThrow({
    where: { slug: "estudio-aurora-demo" },
  });
}
async function guardarRubro(
  page: import("@playwright/test").Page,
  rubro: string,
) {
  await page.goto("/panel/configuracion#negocio");
  const formulario = page.locator(".formulario-rubro");
  await formulario
    .getByLabel("Tipo de negocio", { exact: true })
    .selectOption(rubro);
  await formulario
    .getByRole("button", { name: "Guardar tipo de negocio", exact: true })
    .click();
  await expect(
    page
      .getByText(
        "El tipo de negocio quedó actualizado. Tus datos se conservaron.",
      )
      .first(),
  ).toBeVisible();
  await expect(
    formulario.getByLabel("Tipo de negocio", { exact: true }),
  ).toHaveValue(rubro);
}
async function restaurarConfiguracion(
  id: string,
  configuracion: Prisma.JsonValue | null,
) {
  await db.negocio.update({
    where: { id },
    data: {
      configuracion:
        configuracion === null
          ? Prisma.DbNull
          : (configuracion as Prisma.InputJsonValue),
    },
  });
}

test("cambiar rubro persiste iconos y ejemplos sin tocar datos ni otro negocio", async ({
  page,
}) => {
  const negocio = await demo();
  const otro = await db.negocio.create({
    data: {
      slug: `rubro-prueba-${Date.now()}`,
      nombre: "Negocio aislado de prueba",
      configuracion: { tipoNegocio: "spa", conservar: true },
    },
  });
  const contar = async () =>
    Promise.all([
      db.cliente.count({ where: { negocioId: negocio.id } }),
      db.servicio.count({ where: { negocioId: negocio.id } }),
      db.reserva.count({ where: { negocioId: negocio.id } }),
      db.profesional.count({ where: { negocioId: negocio.id } }),
    ]);
  const totales = await contar();
  const configuracionPrevia = {
    ...((negocio.configuracion as Record<string, Prisma.JsonValue> | null) ??
      {}),
    cantidadLocales: 2,
    configuracionInicialCompleta: true,
    preferenciasDePrueba: { conservar: "sin cambios" },
  };
  try {
    await db.negocio.update({
      where: { id: negocio.id },
      data: { configuracion: configuracionPrevia },
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/panel/configuracion#negocio");
    const formulario = page.locator(".formulario-rubro");
    await formulario.evaluate((form, negocioId) => {
      const campo = document.createElement("input");
      campo.type = "hidden";
      campo.name = "negocioId";
      campo.value = negocioId;
      form.appendChild(campo);
    }, otro.id);
    await formulario
      .getByLabel("Tipo de negocio", { exact: true })
      .selectOption("veterinarias");
    await formulario
      .getByRole("button", { name: "Guardar tipo de negocio", exact: true })
      .click();
    await expect(
      page
        .getByText(
          "El tipo de negocio quedó actualizado. Tus datos se conservaron.",
        )
        .first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      formulario.getByLabel("Tipo de negocio", { exact: true }),
    ).toHaveValue("veterinarias");
    const guardado = await demo();
    expect(guardado.configuracion).toEqual({
      ...configuracionPrevia,
      tipoNegocio: "veterinarias",
      rubro: "Veterinarias",
    });
    expect(guardado.nombre).toBe(negocio.nombre);
    expect(guardado.politicaContacto).toBe(negocio.politicaContacto);
    expect(
      (await db.negocio.findUniqueOrThrow({ where: { id: otro.id } }))
        .configuracion,
    ).toEqual(otro.configuracion);
    expect(await contar()).toEqual(totales);
    await page.goto("/panel/resumen");
    await expect(
      page
        .locator(
          '.nav-panel nav a[href="/panel/servicios"] svg.lucide-paw-print',
        )
        .last(),
    ).toBeVisible();
    await expect(
      page.locator(
        '.acceso-resumen[href="/panel/servicios"] svg.lucide-paw-print',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Contraer menú" }).click();
    await expect(
      page.locator(
        '.nav-panel--contraido a[aria-label="Servicios"] svg.lucide-paw-print',
      ),
    ).toBeVisible();
    await page.goto("/panel/servicios");
    await page.getByText("Nuevo servicio", { exact: true }).first().click();
    const alta = page.locator(".formulario-servicio").first();
    await expect(alta.getByLabel("Nombre", { exact: true })).toHaveAttribute(
      "placeholder",
      "Por ejemplo, Consulta veterinaria",
    );
    await expect(alta.getByLabel("Nombre", { exact: true })).toHaveValue("");
    await expect(alta.getByLabel("Categoría", { exact: true })).toHaveAttribute(
      "placeholder",
      "Por ejemplo, Consultas",
    );
    await page.getByRole("heading", { name: "Servicios", exact: true }).click();
    const tarjeta = page.locator("article.tarjeta-listado").first();
    const nombre = await tarjeta
      .locator(".tarjeta-listado__contenido h2")
      .innerText();
    await tarjeta.locator("summary").click();
    await expect(tarjeta.getByLabel("Nombre", { exact: true })).toHaveValue(
      nombre,
    );
  } finally {
    await restaurarConfiguracion(negocio.id, negocio.configuracion);
    await db.negocio.delete({ where: { id: otro.id } });
  }
});

test("los iconos de rubro son coherentes en móvil y no desbordan el panel", async ({
  page,
}) => {
  const negocio = await demo();
  try {
    await guardarRubro(page, "entrenamiento");
    for (const ancho of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width: ancho, height: 1000 });
      await page.goto("/panel/resumen");
      await expect(
        page.locator(
          '.acceso-resumen[href="/panel/servicios"] svg.lucide-dumbbell',
        ),
      ).toBeVisible();
      if (ancho < 821) {
        await expect(
          page.locator(
            '.panel-inferior a[href="/panel/servicios"] svg.lucide-dumbbell',
          ),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Abrir menú", exact: true })
          .click();
        await expect(
          page.locator(
            '.panel-mobile.abierto a[href="/panel/servicios"] svg.lucide-dumbbell',
          ),
        ).toBeVisible();
        await page
          .locator('.panel-mobile.abierto a[href="/panel/servicios"]')
          .click();
        await expect(page.locator(".panel-mobile.abierto")).toHaveCount(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    await restaurarConfiguracion(negocio.id, negocio.configuracion);
  }
});

test("Profesional no puede cambiar el rubro aunque manipule el formulario", async ({
  page,
}) => {
  const negocio = await demo();
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { email: "demo@turnosrapidos.com.ar" },
  });
  const membresia = await db.membresia.findFirstOrThrow({
    where: { negocioId: negocio.id, usuarioId: usuario.id, activo: true },
  });
  try {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { rol: "PROFESIONAL" },
    });
    await page.goto("/panel/configuracion#negocio");
    const formulario = page.locator(".formulario-rubro");
    await expect(
      formulario.getByLabel("Tipo de negocio", { exact: true }),
    ).toBeDisabled();
    await formulario.evaluate((form) => {
      const select = form.querySelector("select")!;
      select.disabled = false;
      select.value = "tatuajes";
      (form as HTMLFormElement).requestSubmit();
    });
    await expect(formulario.getByRole("alert")).toHaveText(
      "Sólo el dueño o un administrador puede cambiar el tipo de negocio.",
    );
    expect((await demo()).configuracion).toEqual(negocio.configuracion);
  } finally {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { rol: membresia.rol },
    });
  }
});

test("un negocio vacío con rubro antiguo muestra ayudas sin crear servicios", async ({
  page,
}) => {
  const negocio = await demo();
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { email: "demo@turnosrapidos.com.ar" },
  });
  const membresia = await db.membresia.findFirstOrThrow({
    where: { negocioId: negocio.id, usuarioId: usuario.id, activo: true },
  });
  const vacio = await db.negocio.create({
    data: {
      nombre: "Negocio vacío de prueba",
      slug: `vacio-rubro-${Date.now()}`,
      configuracion: { rubro: "Veterinarias" },
    },
  });
  try {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { negocioId: vacio.id },
    });
    await page.goto("/panel/servicios");
    await expect(page.getByText("Cargá tu primer servicio")).toBeVisible();
    await expect(
      page.getByText("Por ejemplo, Consulta veterinaria.", { exact: false }),
    ).toBeVisible();
    await expect(
      page
        .locator(
          '.nav-panel nav a[href="/panel/servicios"] svg.lucide-paw-print',
        )
        .last(),
    ).toBeVisible();
    await page.getByText("Nuevo servicio", { exact: true }).first().click();
    await expect(
      page.locator('.formulario-servicio input[name="nombre"]'),
    ).toHaveValue("");
    expect(await db.servicio.count({ where: { negocioId: vacio.id } })).toBe(0);
  } finally {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { negocioId: negocio.id },
    });
    await db.negocio.delete({ where: { id: vacio.id } });
  }
});

test("Primeros pasos cambia sólo el ejemplo al elegir otro rubro", async ({
  page,
}) => {
  const negocio = await demo();
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { email: "demo@turnosrapidos.com.ar" },
  });
  const membresia = await db.membresia.findFirstOrThrow({
    where: { negocioId: negocio.id, usuarioId: usuario.id, activo: true },
  });
  try {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { activo: false },
    });
    await page.goto("/primeros-pasos");
    const nombre = page.locator('input[name="nombreNegocio"]');
    await nombre.fill("Mi negocio elegido");
    await page
      .locator('select[name="tipoNegocio"]')
      .selectOption("veterinarias");
    await expect(nombre).toHaveAttribute(
      "placeholder",
      "Por ejemplo, Veterinaria Aurora",
    );
    await expect(nombre).toHaveValue("Mi negocio elegido");
    await page.locator('select[name="tipoNegocio"]').selectOption("peluqueria");
    await expect(nombre).toHaveAttribute(
      "placeholder",
      "Por ejemplo, Peluquería Aurora",
    );
    await expect(nombre).toHaveValue("Mi negocio elegido");
    expect((await demo()).configuracion).toEqual(negocio.configuracion);
  } finally {
    await db.membresia.update({
      where: { id: membresia.id },
      data: { activo: membresia.activo },
    });
  }
});
