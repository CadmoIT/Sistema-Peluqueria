/** Recorre navegación diaria, filtros y Google sin conectar cuentas externas. */
import { expect, test } from "./fixtures/panel-fixture";
import { PrismaClient } from "@prisma/client";
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
});
test("la fecha, columnas y leyenda responden sin mostrar vistas de semana o mes", async ({
  page,
}) => {
  await page.goto("/panel/agenda?fecha=2026-09-15");
  await expect(page.locator(".agenda-columna")).toHaveCount(5);
  await expect(page.locator(".agenda-dias button")).toHaveText([
    "MARTES 15",
    "MIÉRCOLES 16",
    "JUEVES 17",
    "VIERNES 18",
    "SÁBADO 19",
  ]);
  const diaSeleccionado = page.locator(
    ".agenda-dias button[aria-pressed=true]",
  );
  await diaSeleccionado.hover();
  await expect(diaSeleccionado).toHaveCSS(
    "background-color",
    "rgb(18, 103, 131)",
  );
  await expect(diaSeleccionado).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    page.getByRole("button", { name: "Hoy", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.locator(".agenda-lateral").evaluate((lateral) => {
      const principal = document.querySelector(".panel-main")!;
      return (
        lateral.getBoundingClientRect().left -
        principal.getBoundingClientRect().left
      );
    }),
  ).toBeLessThanOrEqual(18);
  expect(
    await page.locator(".agenda-principal").evaluate((agenda) => {
      const lateral = document.querySelector(".agenda-lateral")!;
      return (
        agenda.getBoundingClientRect().left -
        lateral.getBoundingClientRect().right
      );
    }),
  ).toBeGreaterThanOrEqual(64);
  await expect(page.locator(".agenda-evento small")).toHaveCount(0);
  await expect(page.locator(".agenda-columna h3").first()).toHaveCSS(
    "font-size",
    "18px",
  );
  await expect(page.locator(".agenda-escala__hora span").first()).toHaveCSS(
    "font-size",
    "15px",
  );
  await expect(page.locator(".fc-timegrid-slot-lane").first()).toHaveCSS(
    "border-bottom-width",
    "0px",
  );
  await expect(
    page.locator(".agenda-dias button[aria-pressed=true]"),
  ).toContainText("MARTES");
  await expect(page.locator(".fc-timeGridWeek-button")).toHaveCount(0);
  await expect(page.locator(".fc-dayGridMonth-button")).toHaveCount(0);
  await expect(
    page.getByText("Turnos, bloqueos y disponibilidad en una vista clara."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Profesional", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Local", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Profesional", exact: true })
    .selectOption({ index: 1 });
  await expect(page.locator(".agenda-columna")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Profesional", exact: true })
    .selectOption("");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("CONFIRMADA");
  await expect(
    page.getByRole("checkbox", { name: "Confirmado", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Ausente", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Ausente", exact: true }).check();
  await expect(
    page.getByRole("combobox", { name: "Estado", exact: true }),
  ).toHaveValue("VARIOS");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("");
  await page.getByRole("button", { name: "2026-09-16", exact: true }).click();
  await expect(page).toHaveURL(/fecha=2026-09-16/);
  await expect(
    page.locator(".agenda-dias button[aria-pressed=true]"),
  ).toContainText("MIÉRCOLES");
  await page.reload();
  await expect(
    page.locator(".agenda-dias button[aria-pressed=true]"),
  ).toContainText("16");
  await page.getByRole("button", { name: "Cinco días siguientes" }).click();
  await expect(page).toHaveURL(/fecha=2026-09-21/);
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(
    page.locator(".agenda-lateral .agenda-mini header"),
  ).toContainText("octubre");
  await page.getByRole("button", { name: "Mes anterior" }).click();
  await page.locator("#nuevo summary").click();
  await expect(page.locator("#nuevo summary")).toHaveCSS("font-size", "18px");
  const clientes = page.locator('select[name="clienteId"]');
  await expect(clientes.locator("option").first()).toHaveText("Nuevo cliente");
  await expect(
    page.getByRole("textbox", { name: "Nombre del cliente", exact: true }),
  ).toBeVisible();
  await clientes.selectOption({ index: 1 });
  await expect(
    page.getByRole("textbox", { name: "Nombre del cliente", exact: true }),
  ).toHaveCount(0);
  await clientes.selectOption("");
  await expect(
    page.getByRole("textbox", { name: "Nombre del cliente", exact: true }),
  ).toBeVisible();
  await expect(clientes).toHaveCSS("font-size", "18px");
  await expect(page.locator('input[name="inicio"]')).toHaveValue(
    "2026-09-21T09:00",
  );
  await page.locator("#nuevo summary").click();
  await page.screenshot({
    path: "test-results/agenda-diaria-desktop.png",
    fullPage: true,
  });
  await page.goto("/panel/agenda?fecha=2026-12-30");
  await expect(page.locator(".agenda-dias button")).toHaveText([
    "MIÉRCOLES 30",
    "JUEVES 31",
    "VIERNES 1",
    "SÁBADO 2",
    "DOMINGO 3",
  ]);
  await page.locator(".agenda-dias button").nth(3).click();
  await expect(page).toHaveURL(/fecha=2027-01-02/);
  await expect(page.locator(".agenda-dias button").first()).toHaveText(
    "SÁBADO 2",
  );
  await page.getByRole("button", { name: "Cinco días anteriores" }).click();
  await expect(page).toHaveURL(/fecha=2026-12-28/);
  await page.goto("/panel/agenda");
  await expect(page.locator(".agenda-dias button").first()).toHaveAttribute(
    "aria-current",
    "date",
  );
});
test("Google Calendar explica la configuración faltante y conserva la fecha", async ({
  page,
}) => {
  await page.goto("/panel/agenda?fecha=2026-09-15");
  await page
    .getByRole("button", { name: "Google Calendar", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Google Calendar" }),
  ).toBeVisible();
  await expect(
    page.getByText("No configurado.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conectar cuenta de Google" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Tus eventos personales no se leerán ni modificarán.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Google Calendar" }),
  ).toHaveCount(0);
  await page.goto(
    "/api/integraciones/google-calendar/conectar?fecha=2026-09-15",
  );
  await expect(page).toHaveURL(
    /\/panel\/agenda\?google=no-configurado&fecha=2026-09-15/,
  );
});
test("agenda móvil mantiene las columnas dentro del área desplazable", async ({
  page,
}) => {
  for (const ancho of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto("/panel/agenda?fecha=2026-09-15");
    await expect(page.locator(".agenda-columna")).toHaveCount(5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(ancho);
    if (ancho < 900) {
      await page.locator(".agenda-filtros-movil summary").click();
      await expect(
        page.getByRole("combobox", { name: "Profesional", exact: true }),
      ).toBeVisible();
      await page.locator(".agenda-filtros-movil summary").click();
    }
    if (ancho === 390)
      await page.screenshot({
        path: "test-results/agenda-diaria-movil.png",
        fullPage: true,
      });
  }
});
test("con un solo local y profesional no se muestran selectores innecesarios", async ({
  page,
}) => {
  process.loadEnvFile(".env.local");
  const db = new PrismaClient();
  const negocio = await db.negocio.findUniqueOrThrow({
    where: { slug: "estudio-aurora-demo" },
    select: { id: true },
  });
  const locales = await db.sede.findMany({
    where: { negocioId: negocio.id, activa: true },
    select: { id: true },
  });
  const personas = await db.profesional.findMany({
    where: { negocioId: negocio.id, activo: true },
    select: { id: true },
  });
  try {
    await db.sede.updateMany({
      where: { negocioId: negocio.id, id: { not: locales[0]!.id } },
      data: { activa: false },
    });
    await db.profesional.updateMany({
      where: { negocioId: negocio.id, id: { not: personas[0]!.id } },
      data: { activo: false },
    });
    await page.goto("/panel/agenda?fecha=2026-09-15");
    await expect(
      page.getByRole("combobox", { name: "Profesional", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Local", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".agenda-columna")).toHaveCount(1);
    await page.locator("#nuevo summary").click();
    await expect(
      page.locator('input[type="hidden"][name="profesionalId"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('input[type="hidden"][name="sedeId"]'),
    ).toHaveCount(1);
    await page.locator('input[name="inicio"]').fill("2026-09-15T03:00");
    await page
      .getByRole("button", { name: "Guardar turno", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "El local está cerrado en ese horario." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/fecha=2026-09-15/);
  } finally {
    await db.sede.updateMany({
      where: { negocioId: negocio.id, id: { in: locales.map((l) => l.id) } },
      data: { activa: true },
    });
    await db.profesional.updateMany({
      where: { negocioId: negocio.id, id: { in: personas.map((p) => p.id) } },
      data: { activo: true },
    });
    await db.$disconnect();
  }
});
