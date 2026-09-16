/** Verifica fichas, archivos e importaciones reales sólo dentro del negocio de demostración. */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { expect, test } from "./fixtures/panel-fixture";

process.loadEnvFile(".env.local");
const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());
async function negocioDemo() {
  return db.negocio.findUniqueOrThrow({
    where: { slug: "estudio-aurora-demo" },
  });
}

test("la ficha usa tres campos y se borra definitivamente sin modificar notas al editar", async ({ page }) => {
  const negocio = await negocioDemo(), email = "ficha-e2e@ejemplo.com.ar";
  try {
    await page.goto("/panel/clientes");
    await expect(page.getByLabel("Mostrar clientes")).toHaveCount(0);
    await expect(page.getByText("Plantilla de ejemplo", { exact: true })).toHaveCount(0);
    await page.getByText("Nuevo cliente", { exact: true }).first().click();
    const formulario = page.locator(".formulario-cliente");
    await expect(formulario.getByLabel("Nombre", { exact: true })).toHaveAttribute("placeholder", "ana");
    await expect(formulario.getByLabel("Apellido", { exact: true })).toHaveCount(0);
    await expect(formulario.getByLabel("Notas")).toHaveCount(0);
    await formulario.getByLabel("Nombre", { exact: true }).fill("Ficha de prueba");
    await formulario.getByLabel("Email", { exact: true }).fill(email);
    await formulario.getByRole("button", { name: "Guardar cliente" }).click();
    const fila = page.getByRole("row").filter({ hasText: email }); await expect(fila).toBeVisible();
    const cliente = await db.cliente.findFirstOrThrow({ where: { negocioId: negocio.id, email } });
    await db.cliente.update({ where: { id: cliente.id }, data: { apellido: "Anterior", notas: "Nota conservada" } });
    await page.reload();
    await fila.getByRole("button", { name: "Editar cliente" }).click();
    const dialogo = page.getByRole("dialog", { name: "Editar información" });
    await expect(dialogo.getByLabel("Nombre", { exact: true })).toHaveValue("Ficha de prueba Anterior");
    await dialogo.getByLabel("Email", { exact: true }).fill(email);
    await dialogo.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialogo).toHaveCount(0);
    const guardado = await db.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(guardado.apellido).toBe("Anterior"); expect(guardado.notas).toBe("Nota conservada");
    await fila.getByRole("button", { name: "Eliminar cliente" }).click();
    await expect(page.getByRole("dialog", { name: "¿Eliminar cliente?" })).toContainText("no se puede deshacer");
    await page.getByRole("button", { name: "Eliminar cliente", exact: true }).last().click();
    await expect(fila).toHaveCount(0);
    expect(await db.cliente.findUnique({ where: { id: cliente.id } })).toBeNull();
  } finally { await db.cliente.deleteMany({ where: { negocioId: negocio.id, email } }); }
});

test("exporta fichas reales y teléfonos como texto sin plantilla ficticia", async ({
  page,
  browser,
}) => {
  const negocio = await negocioDemo();
  const cliente = await db.cliente.create({
    data: {
      negocioId: negocio.id,
      nombre: "Exportación e2e",
      email: "exportar-e2e@ejemplo.com.ar",
      telefono: "001112345678",
    },
  });
  try {
    const url = "/api/v1/clientes/exportar?buscar=exportar-e2e&estado=activos";
    const csv = await page.request.get(`${url}&formato=csv`);
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain('"001112345678"');
    expect(await csv.text()).toContain(cliente.email!);
    const xlsx = await page.request.get(`${url}&formato=xlsx`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(
      (await xlsx.body()) as unknown as Parameters<typeof libro.xlsx.load>[0],
    );
    expect(libro.worksheets[0]!.rowCount).toBe(2);
    expect(libro.worksheets[0]!.getCell("D2").value).toBe("001112345678");
    expect(libro.worksheets[0]!.getCell("D2").numFmt).toBe("@");
    const vacio = await page.request.get(
      "/api/v1/clientes/exportar?buscar=no-existe-ninguna-ficha-e2e&formato=csv",
    );
    expect((await vacio.text()).trim().split("\r\n")).toHaveLength(1);
    const ejemplo = await page.request.get(
      "/api/v1/clientes/exportar?plantilla=ejemplo&formato=csv",
    );
    expect(ejemplo.status()).toBe(400);
    await db.cliente.update({
      where: { id: cliente.id },
      data: { archivadoEn: new Date() },
    });
    expect(
      await (await page.request.get(`${url}&formato=csv`)).text(),
    ).toContain(cliente.email!);
    expect(
      await (
        await page.request.get(
          `${url.replace("activos", "archivados")}&formato=csv`,
        )
      ).text(),
    ).toContain(cliente.email!);
    const anonimo = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    expect(
      (
        await anonimo.request.get(
          "http://localhost:3000/api/v1/clientes/exportar",
        )
      ).status(),
    ).toBe(401);
    await anonimo.close();
  } finally {
    await db.cliente.deleteMany({ where: { id: cliente.id, negocioId: negocio.id } });
  }
});

test("la importación reconoce encabezados, revisa errores y sólo completa vacíos", async ({
  page,
}) => {
  const negocio = await negocioDemo();
  const emails = [
    "importar-e2e@ejemplo.com.ar",
    "completar-e2e@ejemplo.com.ar",
    "archivado-e2e@ejemplo.com.ar",
    "excel-e2e@ejemplo.com.ar",
  ];
  const existente = await db.cliente.create({
    data: {
      negocioId: negocio.id,
      nombre: "Nombre original",
      email: emails[1]!.toUpperCase(),
      telefono: "11 8765-4321",
    },
  });
  const archivado = await db.cliente.create({
    data: {
      negocioId: negocio.id,
      nombre: "Archivado e2e",
      email: emails[2],
      telefono: "11 2222-3333",
      archivadoEn: new Date(),
    },
  });
  try {
    await page.goto("/panel/clientes");
    await page.getByRole("button", { name: "Importar", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "clientes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Nombre;Apellido;Mail;Número\nNueva;Ficha;${emails[0]};11 12345678\nNo reemplazar;Completado;${emails[1]};11 87654321\nArchivado;Ficha;${emails[2]};\nInválido;;correo-invalido;`,
      ),
    });
    const dialogo = page.getByRole("dialog", { name: "Importar clientes" });
    await expect(
      dialogo.getByRole("combobox", { name: "Mail", exact: true }),
    ).toHaveValue("email");
    await expect(
      dialogo.getByRole("combobox", { name: "Número", exact: true }),
    ).toHaveValue("telefono");
    await dialogo.getByLabel("Completar datos vacíos").check();
    await expect(dialogo.locator(".revision-importacion")).toContainText(
      "1 nuevos · 2 para completar · 0 omitidos · 1 con errores",
    );
    await dialogo
      .getByRole("combobox", { name: "Número", exact: true })
      .selectOption("email");
    await expect(dialogo.getByRole("alert")).toContainText("una sola columna");
    await expect(
      dialogo.getByRole("button", { name: "Confirmar importación" }),
    ).toBeDisabled();
    await dialogo
      .getByRole("combobox", { name: "Número", exact: true })
      .selectOption("telefono");
    await expect(
      dialogo.getByRole("button", { name: "Confirmar importación" }),
    ).toBeEnabled();
    await dialogo
      .getByRole("button", { name: "Confirmar importación" })
      .click();
    await expect(dialogo.locator(".mensaje-importacion")).toContainText(
      "1 creados · 2 actualizados · 0 omitidos · 1 con errores",
    );
    const completado = await db.cliente.findUniqueOrThrow({
      where: { id: existente.id },
    });
    expect(completado.nombre).toBe("Nombre original");
    expect(completado.apellido).toBe("Completado");
    expect(completado.telefono).toBe("11 8765-4321");
    expect(completado.email).toBe(emails[1]!.toUpperCase());
    const conflicto = await page.request.post(
      "/api/v1/clientes/importacion/revisar",
      { data: { filas: [{ email: emails[1], telefono: "1122223333" }] } },
    );
    expect(conflicto.status()).toBe(200);
    expect((await conflicto.json()).errores[0].mensaje).toContain(
      "fichas distintas",
    );
    expect(
      (await db.cliente.findUniqueOrThrow({ where: { id: archivado.id } }))
        .archivadoEn,
    ).not.toBeNull();
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Clientes");
    hoja.addRow(["Nombre", "E-mail", "Móvil"]);
    hoja.addRow(["Excel e2e", emails[3], "001112345678"]);
    await dialogo.locator('input[type="file"]').setInputFiles({
      name: "clientes.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(await libro.xlsx.writeBuffer()),
    });
    await expect(dialogo.locator(".revision-importacion")).toContainText(
      "1 nuevos",
    );
    await dialogo
      .getByRole("button", { name: "Confirmar importación" })
      .click();
    await expect(dialogo.locator(".mensaje-importacion")).toContainText(
      "1 creados",
    );
    expect(
      (
        await db.cliente.findFirstOrThrow({
          where: { negocioId: negocio.id, email: emails[3] },
        })
      ).telefono,
    ).toBe("001112345678");
  } finally {
    await db.cliente.deleteMany({
      where: {
        negocioId: negocio.id,
        OR: [
          { email: { in: emails } },
          { id: { in: [existente.id, archivado.id] } },
        ],
      },
    });
  }
});

test("Clientes y sus acciones se leen sin recortes en móvil y escritorio", async ({
  page,
}) => {
  await page.goto("/panel/clientes");
  await expect(
    page.getByText("La información que tus clientes decidan compartir", {
      exact: false,
    }),
  ).toHaveCount(0);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByText("Nuevo cliente", { exact: true }).first().click();
    const campo = page
      .locator(".formulario-cliente")
      .getByLabel("Nombre", { exact: true });
    await expect(campo).toBeVisible();
    const limites = (await campo.boundingBox())!;
    expect(limites.x).toBeGreaterThanOrEqual(0);
    expect(limites.x + limites.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const fila = page.locator(".tabla-panel__fila").first();
    for (const name of ["Editar cliente", "Eliminar cliente"]) {
      const boton = fila.getByRole("button", { name });
      await expect(boton).toBeVisible();
      expect((await boton.boundingBox())!.width).toBeGreaterThanOrEqual(40);
    }
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `test-results/clientes-${width}.png`,
        fullPage: true,
      });
  }
  await page.getByText("Nuevo cliente", { exact: true }).first().click();
  await page.screenshot({
    path: "test-results/cliente-formulario.png",
    fullPage: true,
  });
});

test("una reserva pública crea otra ficha después de borrar definitivamente la anterior", async ({
  page,
}) => {
  const negocio = await negocioDemo();
  const cliente = await db.cliente.create({
    data: {
      negocioId: negocio.id,
      nombre: "Reserva e2e",
      email: "reserva-archivo-e2e@ejemplo.com.ar",
      telefono: "11 9999-8765",
      archivadoEn: new Date(),
      notas: "Historial conservado",
    },
  });
  let reservaId: string | undefined;
  try {
    await db.cliente.delete({ where: { id: cliente.id } });
    const servicio = await db.servicio.findFirstOrThrow({
      where: { negocioId: negocio.id, activo: true },
      include: { profesionales: true, sedes: true },
    });
    let inicio = "";
    const profesionalId = servicio.profesionales[0]!.profesionalId;
    const sedeId = servicio.sedes[0]!.sedeId;
    for (let dias = 7; dias < 21 && !inicio; dias++) {
      const fecha = new Date(Date.now() + dias * 86400000)
        .toISOString()
        .slice(0, 10);
      const parametros = new URLSearchParams({
        slug: negocio.slug,
        servicioId: servicio.id,
        profesionalId,
        sedeId,
        fecha,
      });
      const respuesta = await page.request.get(
        `/api/reservas-publicas/disponibilidad?${parametros}`,
      );
      expect(respuesta.status()).toBe(200);
      inicio = (await respuesta.json()).horarios[0]?.inicio || "";
    }
    expect(inicio).not.toBe("");
    const respuesta = await page.request.post("/api/reservas-publicas", {
      data: {
        slug: negocio.slug,
        servicioId: servicio.id,
        profesionalId,
        sedeId,
        inicio,
        telefono: "1199998765",
        email: cliente.email,
      },
    });
    expect(respuesta.status(), await respuesta.text()).toBe(201);
    const codigo = (await respuesta.json()).codigo;
    const reserva = await db.reserva.findFirstOrThrow({
      where: { negocioId: negocio.id, codigo },
    });
    reservaId = reserva.id;
    expect(reserva.clienteId).not.toBe(cliente.id);
    const reactivado = await db.cliente.findUniqueOrThrow({
      where: { id: reserva.clienteId! },
    });
    expect(reactivado.archivadoEn).toBeNull();
    expect(reactivado.notas).toBeNull();
    expect(
      await db.cliente.count({
        where: { negocioId: negocio.id, email: cliente.email },
      }),
    ).toBe(1);
  } finally {
    if (reservaId) await db.reserva.delete({ where: { id: reservaId } });
    await db.cliente.deleteMany({ where: { negocioId: negocio.id, telefono: { in: ["11 9999-8765", "1199998765"] } } });
  }
});

test("exportación e importación ignoran un negocio ajeno enviado por el navegador", async ({
  page,
}) => {
  const demo = await negocioDemo();
  const ajeno = await db.negocio.create({
    data: {
      nombre: "Prueba aislada e2e",
      slug: `clientes-aislamiento-e2e-${Date.now()}`,
    },
  });
  const email = "aislamiento-clientes-e2e@ejemplo.com.ar";
  const ficha = await db.cliente.create({
    data: { negocioId: ajeno.id, nombre: "Información privada", email },
  });
  try {
    const exportacion = await page.request.get(
      `/api/v1/clientes/exportar?formato=csv&buscar=${email}&negocioId=${ajeno.id}`,
    );
    expect(exportacion.status()).toBe(200);
    expect(await exportacion.text()).not.toContain("Información privada");
    const datos = {
      negocioId: ajeno.id,
      completarExistentes: true,
      filas: [{ nombre: "Ficha de la demo", email }],
    };
    const revision = await page.request.post(
      "/api/v1/clientes/importacion/revisar",
      { data: datos },
    );
    expect(revision.status()).toBe(200);
    expect((await revision.json()).creados).toBe(1);
    const confirmacion = await page.request.post(
      "/api/v1/clientes/importacion/confirmar",
      { data: datos },
    );
    expect(confirmacion.status()).toBe(200);
    expect(
      (await db.cliente.findUniqueOrThrow({ where: { id: ficha.id } })).nombre,
    ).toBe("Información privada");
    expect(
      await db.cliente.count({ where: { negocioId: demo.id, email } }),
    ).toBe(1);
  } finally {
    await db.cliente.deleteMany({ where: { negocioId: demo.id, email } });
    await db.negocio.delete({ where: { id: ajeno.id } });
  }
});
