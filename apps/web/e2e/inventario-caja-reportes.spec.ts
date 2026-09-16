/** Comprueba inventario, carrito y reportes con registros temporales exclusivos de la demo. */
import { Prisma, PrismaClient } from "@prisma/client";
import { expect, test } from "./fixtures/panel-fixture";
process.loadEnvFile(".env.local");
const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());
test("inventario admite columnas libres y ajustes sin badges ni pérdida de datos ocultos", async ({ page }) => {
  const negocio = await db.negocio.findUniqueOrThrow({ where: { slug: "estudio-aurora-demo" } });
  let productoId = "", columnaId = "";
  try {
    await page.goto("/panel/inventario");
    await expect(page.getByRole("columnheader", { name: "SKU", exact: true })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Costo", exact: true })).toHaveCount(0);
    await page.getByText("Nuevo producto", { exact: true }).first().click();
    const form = page.locator("details[open] .formulario-flotante");
    await expect(form.getByLabel("SKU", { exact: true })).toHaveCount(0);
    await expect(form.getByLabel("Stock mínimo")).toHaveCount(0);
    await form.getByLabel("Nombre", { exact: true }).fill("Producto temporal e2e");
    await form.getByLabel("Precio", { exact: true }).fill("2500");
    await form.getByLabel("Cantidad", { exact: true }).fill("3");
    await form.getByRole("button", { name: "Guardar producto" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Producto temporal e2e" }).first()).toBeVisible();
    const producto = await db.producto.findFirstOrThrow({ where: { negocioId: negocio.id, nombre: "Producto temporal e2e" } }); productoId = producto.id;
    const existencia = await db.existencia.findFirstOrThrow({ where: { productoId } });
    await db.producto.update({ where: { id: productoId }, data: { sku: "CONSERVAR", costo: 500 } });
    await page.getByLabel("Buscar productos").fill(producto.nombre);
    const fila = page.getByRole("row").filter({ hasText: producto.nombre }).first();
    await fila.getByRole("button", { name: /Agregar una unidad/ }).click();
    await expect(fila.locator(".cantidad-inventario > span")).toHaveText("4");
    await fila.locator("summary[aria-label]").click();
    await page.locator("details[open] .formulario-flotante").getByLabel("Nombre", { exact: true }).fill("Producto temporal e2e");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    expect((await db.producto.findUniqueOrThrow({ where: { id: productoId } })).sku).toBe("CONSERVAR");
    await page.getByRole("button", { name: "Editar tabla", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Editar tabla", exact: true });
    await editor.getByLabel("Nombre", { exact: true }).fill("Vencimiento e2e");
    await editor.getByLabel("Tipo", { exact: true }).selectOption("FECHA");
    await editor.getByRole("button", { name: "Agregar columna", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Vencimiento e2e" })).toHaveCount(1);
    columnaId = (await db.columnaInventario.findFirstOrThrow({ where: { negocioId: negocio.id, nombre: "Vencimiento e2e" } })).id;
    await page.keyboard.press("Escape");
    await fila.locator("summary[aria-label]").click();
    await page.locator("details[open] .formulario-flotante").getByLabel("Vencimiento e2e", { exact: true }).fill("2028-12-31");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(fila).toContainText("2028-12-31");
    expect((await db.existencia.findUniqueOrThrow({ where: { id: existencia.id } })).cantidad).toBe(4);
    await fila.getByRole("button", { name: `Eliminar ${producto.nombre}`, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("4");
    await page.getByRole("button", { name: "Eliminar definitivamente" }).click();
    await expect(page.getByRole("row").filter({ hasText: producto.nombre })).toHaveCount(0);
    expect(await db.producto.findUnique({ where: { id: productoId } })).toBeNull();
  } finally {
    if (productoId) { await db.movimientoStock.deleteMany({ where: { negocioId: negocio.id, OR: [{ productoId }, { referencia: `Baja definitiva del producto:${productoId}`, productoId: null }] } }); await db.producto.deleteMany({ where: { id: productoId, negocioId: negocio.id } }); }
    if (columnaId) await db.columnaInventario.deleteMany({ where: { id: columnaId, negocioId: negocio.id } });
    await db.negocio.update({ where: { id: negocio.id }, data: { configuracion: negocio.configuracion ?? Prisma.JsonNull } });
  }
});
test("el carrito atribuye toda la compra y los reportes muestran dinero registrado", async ({ page }) => {
  const negocio = await db.negocio.findUniqueOrThrow({ where: { slug: "estudio-aurora-demo" } });
  const sede = await db.sede.findFirstOrThrow({ where: { negocioId: negocio.id, activa: true }, orderBy: { nombre: "asc" } });
  const profesional = await db.profesional.create({ data: { negocioId: negocio.id, nombre: "Vendedor temporal e2e" } });
  const producto = await db.producto.create({ data: { negocioId: negocio.id, nombre: "Venta temporal e2e", precio: 1000, existencias: { create: { negocioId: negocio.id, sedeId: sede.id, cantidad: 8 } } } });
  let ventaId = "";
  try {
    await page.goto("/panel/caja");
    await expect(page.locator(".metrica-operativa svg")).toHaveCount(0);
    await page.getByLabel("Buscar productos o servicios").fill(producto.nombre);
    await page.getByRole("button", { name: `Agregar ${producto.nombre}`, exact: true }).click();
    await page.getByRole("button", { name: "Carrito (1)" }).click();
    const carrito = page.getByRole("dialog", { name: "Carrito", exact: true });
    await expect(carrito.getByLabel("Atribuir toda la compra a")).toHaveValue("");
    await carrito.getByRole("button", { name: `Agregar ${producto.nombre}`, exact: true }).click();
    await carrito.getByLabel("Atribuir toda la compra a").selectOption(profesional.id);
    await carrito.getByRole("button", { name: "Confirmar compra" }).click();
    await expect(carrito).toHaveCount(0);
    const item = await db.ventaItem.findFirstOrThrow({ where: { productoId: producto.id }, include: { venta: true } }); ventaId = item.ventaId;
    expect(Number(item.venta.total)).toBe(2000); expect(item.venta.profesionalId).toBe(profesional.id);
    expect((await db.existencia.findFirstOrThrow({ where: { productoId: producto.id } })).cantidad).toBe(6);
    await page.goto(`/panel/reportes?periodo=dia&profesional=${profesional.id}`);
    await expect(page.locator(".metrica-operativa").first()).toContainText("2.000");
    await expect(page.getByRole("button", { name: "Aplicar", exact: true })).toHaveCount(0);
    const barra = page.getByRole("button", { name: /Ingresos.*2\.000/ }).first();
    await expect(barra).toBeEnabled();
    await barra.focus(); await expect(page.getByRole("tooltip")).toContainText("2.000");
    await page.getByLabel("Profesional o atribución").selectOption("local");
    await expect(page).toHaveURL(/profesional=local/);
    await expect(page.getByLabel("Profesional o atribución")).toHaveValue("local");
  } finally {
    if (ventaId) { const venta = await db.venta.findUnique({ where: { id: ventaId } }); if (venta) await db.movimientoCaja.deleteMany({ where: { negocioId: negocio.id, concepto: `Venta ${venta.id.slice(-6).toUpperCase()}` } }); await db.venta.deleteMany({ where: { id: ventaId, negocioId: negocio.id } }); }
    await db.movimientoStock.deleteMany({ where: { negocioId: negocio.id, productoId: producto.id } });
    await db.producto.deleteMany({ where: { id: producto.id, negocioId: negocio.id } });
    await db.profesional.deleteMany({ where: { id: profesional.id, negocioId: negocio.id } });
  }
});
test("listados y métricas mantienen legibilidad y no desbordan en los cuatro anchos", async ({ page }) => {
  for (const ruta of ["servicios", "equipo", "inventario", "caja", "reportes", "mi-sitio"]) {
    await page.goto(`/panel/${ruta}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      const excedidos = ancho > width ? await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).slice(-12).map((e) => ({ elemento: e.tagName, clase: e.className, ancho: e.getBoundingClientRect().width }))) : [];
      expect(ancho, `${ruta}: ${JSON.stringify(excedidos)}`).toBeLessThanOrEqual(width);
      if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/${ruta}-limpio-${width}.png`, fullPage: true });
    }
  }
});
