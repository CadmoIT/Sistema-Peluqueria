/** Comprueba lecturas, escrituras y avisos reales usando cuentas locales desechables. */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const conexion = new URL(process.env.DATABASE_URL ?? "");
if (process.env.PRUEBAS_VENCIMIENTO_MP !== "1" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(conexion.hostname) ||
  !/^mp_vencimiento_prueba_[a-z0-9_]+$/.test(conexion.searchParams.get("schema") ?? "")) throw new Error("Base no autorizada para pruebas.");
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("franja fina, servidor de solo lectura, exportación y recuperación explícita", async ({ page }, info) => {
  const base = "http://127.0.0.1:3107";
  const marca = `vigencia-e2e-${randomUUID()}`;
  const email = `${marca}@example.test`;
  const password = "Clave-Solo-Pruebas-2026";
  let negocioId: string | undefined;
  let usuarioId: string | undefined;
  const errores: string[] = [];
  page.on("pageerror", (error) => errores.push(error.message));
  try {
    const registro = await page.request.post("/api/autenticacion/sign-up/email", {
      headers: { Origin: base }, data: { name: "Prueba aislada", email, password },
    });
    expect(registro.ok()).toBeTruthy();
    const usuario = await db.usuario.findUniqueOrThrow({ where: { email } });
    usuarioId = usuario.id;
    await db.usuario.update({ where: { id: usuario.id }, data: { emailVerificado: true } });
    const acceso = await page.request.post("/api/autenticacion/sign-in/email", {
      headers: { Origin: base }, data: { email, password },
    });
    expect(acceso.ok()).toBeTruthy();
    const negocio = await db.negocio.create({ data: {
      nombre: "Negocio de prueba aislada", slug: marca, publicado: true,
      configuracion: { tipoNegocio: "peluqueria", configuracionInicialCompleta: true },
      membresias: { create: { usuarioId: usuario.id, rol: "DUENO" } },
      clientes: { create: { nombre: "Cliente histórico", email: "historico@example.test" } },
      sedes: { create: { nombre: "Local principal", subdominio: marca, direccion: "" } },
      configuracionSitio: { create: { borrador: { titulo: "Diseño guardado" }, publicada: { titulo: "Diseño guardado" } } },
      suscripcion: { create: { plan: "autogestionado", estado: "ACTIVA", precioMensual: 9900,
        cancelarAlFinal: false, proximoCobro: new Date(Date.now() + 2 * 86_400_000) } },
    } });
    negocioId = negocio.id;
    await page.goto("/panel/facturacion");
    await expect(page.getByRole("heading", { name: "Facturación", exact: true })).toBeVisible();
    await expect(page.locator(".panel-franja-suscripcion")).toHaveCount(0);
    await db.suscripcion.update({ where: { negocioId }, data: { cancelarAlFinal: true } });
    await page.reload();
    const franja = page.locator(".panel-franja-suscripcion");
    await expect(franja).toContainText("Te quedan 2 días");
    await expect(page.getByTestId("carga-aplicacion")).toHaveCount(0);
    expect((await franja.boundingBox())!.height).toBeLessThan(48);
    await expect(franja.getByRole("link")).toHaveAttribute("href", "/panel/facturacion#renovacion-automatica");
    await page.evaluate(() => window.scrollTo(0, 0));
    expect((await franja.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: info.outputPath("franja-escritorio.png"), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect((await franja.boundingBox())!.height).toBeLessThan(84);
    await page.screenshot({ path: info.outputPath("franja-movil.png"), fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 });
    await db.suscripcion.update({ where: { negocioId }, data: { proximoCobro: new Date(Date.now() - 1000) } });
    await page.goto("/panel/clientes");
    await expect(franja).toContainText("Tus datos siguen a salvo");
    await expect(page.getByText("Cliente histórico", { exact: true })).toBeVisible();
    const exportacion = await page.request.get("/api/v1/clientes/exportar?formato=csv");
    expect(exportacion.status()).toBe(200); expect(await exportacion.text()).toContain("Cliente histórico");
    for (const ruta of ["/api/v1/clientes/importacion/confirmar", "/api/v1/compras/importacion/confirmar", "/api/v1/archivos/carga", "/api/panel/mi-sitio"]) {
      const respuesta = await page.request.post(ruta, { headers: { Origin: base }, data: {} });
      expect(respuesta.status(), ruta).toBe(403);
    }
    await page.getByText("Nuevo cliente", { exact: true }).first().click();
    const formulario = page.locator(".cabecera-seccion .formulario-cliente");
    await formulario.getByLabel("Nombre", { exact: true }).fill("No debe guardarse");
    await formulario.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(page).toHaveURL(/panel\/planes\?acceso=solo-lectura/);
    expect(await db.cliente.count({ where: { negocioId } })).toBe(1);
    await expect(page.locator('form[action*="plan=autogestionado"] button')).toBeEnabled();
    await db.negocio.update({ where: { id: negocioId }, data: { publicado: false, sitioRetiradoEn: new Date() } });
    await db.suscripcion.update({ where: { negocioId }, data: { estado: "CONFIGURACION_GRATUITA", plan: "PRUEBA" } });
    await page.goto("/panel/mi-sitio");
    await page.getByRole("button", { name: "Volver a generar mi sitio" }).click();
    await expect(page.getByRole("status")).toContainText("Activá Plus o Pro");
    await db.suscripcion.update({ where: { negocioId }, data: {
      estado: "ACTIVA", plan: "autogestionado", proximoCobro: new Date(Date.now() + 30 * 86_400_000), primerPagoEn: new Date(),
    } });
    await page.reload();
    await page.getByRole("button", { name: "Volver a generar mi sitio" }).click();
    await expect.poll(async () => (await db.negocio.findUniqueOrThrow({ where: { id: negocioId } })).sitioRetiradoEn, { timeout: 15_000 }).toBeNull();
    await expect(page.getByRole("button", { name: "Volver a generar mi sitio" })).toHaveCount(0);
    const recuperado = await db.negocio.findUniqueOrThrow({ where: { id: negocioId }, include: { configuracionSitio: true } });
    expect(recuperado.sitioRetiradoEn).toBeNull(); expect(recuperado.publicado).toBe(true);
    expect(recuperado.slug).toBe(marca); expect(recuperado.configuracionSitio!.publicada).toEqual({ titulo: "Diseño guardado" });
    expect(errores).toEqual([]);
  } finally {
    if (negocioId) await db.negocio.deleteMany({ where: { id: negocioId, slug: marca } });
    if (usuarioId) await db.usuario.deleteMany({ where: { id: usuarioId, email } });
  }
});
