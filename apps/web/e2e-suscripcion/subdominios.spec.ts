/** Verifica páginas públicas y aislamiento de sucursales en una base local desechable. */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const conexion = new URL(process.env.DATABASE_URL ?? "");
if (process.env.PRUEBAS_VENCIMIENTO_MP !== "1" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(conexion.hostname) ||
  !/^mp_vencimiento_prueba_[a-z0-9_]+$/.test(conexion.searchParams.get("schema") ?? "")) throw new Error("Base no autorizada para pruebas.");
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test("el registro asigna el dominio y Mi sitio sólo permite editar si hay un homónimo", async ({ page }) => {
  const base = "http://localhost:3107";
  const marca = `homonimo${randomUUID().replace(/-/g, "")}`;
  const email = `${marca}@example.test`;
  const password = "Clave-Solo-Pruebas-2026";
  const nombre = `Barber ${marca}`;
  const ids: string[] = [];
  let usuarioId: string | undefined;
  try {
    expect((await page.request.post("/api/autenticacion/sign-up/email", { headers: { Origin: base }, data: { name: "Prueba aislada", email, password } })).ok()).toBeTruthy();
    const usuario = await db.usuario.findUniqueOrThrow({ where: { email } });
    usuarioId = usuario.id;
    await db.usuario.update({ where: { id: usuario.id }, data: { emailVerificado: true } });
    expect((await page.request.post("/api/autenticacion/sign-in/email", { headers: { Origin: base }, data: { email, password } })).ok()).toBeTruthy();
    const configuracion = await page.request.post("/api/configuracion-inicial", { headers: { Origin: base }, data: { nombreNegocio: nombre, tipoNegocio: "peluqueria", cantidadLocales: 1, planId: "PRUEBA" } });
    expect(configuracion.ok(), `${configuracion.status()}: ${await configuracion.text()}`).toBeTruthy();
    const inicial = await configuracion.json();
    ids.push(inicial.id);
    const negocio = await db.negocio.findUniqueOrThrow({ where: { id: inicial.id } });
    expect(negocio.subdominio).toBe(`barber${marca}`);
    await page.goto("/panel/mi-sitio");
    await expect(page.getByRole("region", { name: "Dirección del sitio" })).toHaveCount(0);
    const homonimo = await db.negocio.create({ data: { nombre, nombreClave: negocio.nombreClave, slug: `${marca}-otro`, subdominio: `${negocio.subdominio}-2` } });
    ids.push(homonimo.id);
    await page.reload();
    const editor = page.getByRole("region", { name: "Dirección del sitio" });
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox").fill(`${marca}-nuevo`);
    await editor.getByRole("button", { name: "Guardar dirección" }).click();
    await expect(editor.getByRole("status")).toHaveText(/Tu dirección quedó actualizada|La dirección ya está guardada/);
    await expect.poll(async () => (await db.negocio.findUniqueOrThrow({ where: { id: negocio.id } })).subdominio).toBe(`${marca}-nuevo`);
    expect((await db.subdominioAnterior.findUniqueOrThrow({ where: { nombre: negocio.subdominio! } })).negocioId).toBe(negocio.id);
    await expect(page.getByRole("link", { name: "Página Web" })).toHaveAttribute("href", `/sitio/${marca}-nuevo`);
  } finally {
    await db.negocio.deleteMany({ where: { id: { in: ids } } });
    if (usuarioId) await db.usuario.deleteMany({ where: { id: usuarioId, email } });
  }
});

test("una sede abre directamente y varias usan rutas propias sin cruzar negocios", async ({ page }, info) => {
  const marca = `sedes-e2e-${randomUUID()}`;
  let id: string | undefined;
  try {
    const negocio = await db.negocio.create({ data: {
      slug: marca, subdominio: `${marca}-publico`, nombre: "Negocio de sucursales", publicado: true,
      suscripcion: { create: { plan: "PRUEBA", precioMensual: 0, pruebaFinalizaEn: new Date(Date.now() + 86_400_000) } },
      configuracionSitio: { create: { borrador: {}, publicada: { titulo: "Negocio de sucursales" } } },
      sedes: { create: [{ nombre: "Centro", direccion: "Dirección Centro", subdominio: `${marca}-local-1` }, { nombre: "Norte", direccion: "Dirección Norte" }] },
    }, include: { sedes: true } });
    id = negocio.id;
    const centro = negocio.sedes.find((sede) => sede.nombre === "Centro")!;
    const norte = negocio.sedes.find((sede) => sede.nombre === "Norte")!;
    for (const sede of negocio.sedes) await db.servicio.create({ data: {
      negocioId: id, nombre: `Servicio ${sede.nombre}`, precio: 1000, duracionMinutos: 30,
      sedes: { create: { sedeId: sede.id } },
    } });
    await page.goto(`/sitio/${negocio.subdominio}`);
    await expect(page.getByText("Elegí la sucursal que te quede más cerca.")).toBeVisible();
    await page.screenshot({ path: info.outputPath("selector-sucursales.png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: info.outputPath("selector-sucursales-movil.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("link", { name: /Centro/ }).click();
    await expect(page).toHaveURL(new RegExp(`/sucursal/${centro.id}$`));
    await expect(page.getByText("Dirección Centro", { exact: true })).toBeVisible();
    await expect(page.getByText("Servicio Centro", { exact: true })).toBeVisible();
    await expect(page.getByText("Servicio Norte", { exact: true })).toHaveCount(0);
    await page.goto(`/sitio/${marca}-local-1`);
    await expect(page.getByText("Dirección Centro", { exact: true })).toBeVisible();
    const ajena = await page.request.get(`/sitio/${negocio.subdominio}/sucursal/sede-ajena`);
    expect(ajena.status()).toBe(404);
    await db.sede.update({ where: { id: norte.id }, data: { activa: false } });
    await page.goto(`/sitio/${negocio.subdominio}`);
    await expect(page.getByText("Elegí la sucursal que te quede más cerca.")).toHaveCount(0);
    await expect(page.getByText("Servicio Centro", { exact: true })).toBeVisible();
    expect((await page.request.get(`/sitio/${negocio.subdominio}/sucursal/${norte.id}`)).status()).toBe(404);
    await db.subdominioAnterior.create({ data: { nombre: `${marca}-anterior`, negocioId: id } });
    await page.goto(`/sitio/${marca}-anterior`);
    await expect(page.getByText("Servicio Centro", { exact: true })).toBeVisible();
    await db.suscripcion.update({ where: { negocioId: id }, data: { pruebaFinalizaEn: new Date(Date.now() - 1000) } });
    await page.goto(`/sitio/${negocio.subdominio}/sucursal/${centro.id}`);
    await expect(page.getByText("Servicio Centro", { exact: true })).toHaveCount(0);
  } finally {
    if (id) await db.negocio.deleteMany({ where: { id, slug: marca } });
  }
});
