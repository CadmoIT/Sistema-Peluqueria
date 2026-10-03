/** Comprueba invitación explícita, privacidad, sincronización y revocación entre navegadores. */
import { expect, test, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { crearEquipoPrueba } from "../pruebas/equipo-fixture";
const db = new PrismaClient(),
  base = "http://localhost:3108",
  password = "Clave-Exclusiva-Pruebas-2026";
test.afterAll(() => db.$disconnect());
async function acceder(c: BrowserContext, email: string) {
  const r = await c.request.post("/api/autenticacion/sign-in/email", {
    headers: { Origin: base },
    data: { email, password },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}
test("cuenta incorporada, panel propio, operación compartida y acceso revocado", async ({
  browser,
  page,
}, info) => {
  const f = await crearEquipoPrueba(db),
    usuario = f.empleados[0]!.usuario;
  const empleadoContexto = await browser.newContext({ baseURL: base }),
    empleado = await empleadoContexto.newPage();
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  empleado.on("pageerror", (e) => errores.push(e.message));
  try {
    const contrasena = await hashPassword(password);
    await db.cuentaOAuth.createMany({
      data: [f.dueno, usuario].map((u) => ({
        usuarioId: u.id,
        proveedor: "credential",
        cuentaProveedorId: u.id,
        contrasena,
      })),
    });
    await acceder(page.context(), f.dueno.email);
    await page.goto("/panel/equipo");
    const card = page.locator(".lista-equipo article").filter({
      has: page.getByRole("heading", { name: "Barbero 1", exact: true }),
    });
    await expect(card.getByText("Sin cuenta", { exact: true })).toBeVisible();
    await card.getByText("Invitar / reenviar", { exact: true }).click();
    await card.getByLabel("Email", { exact: true }).fill(usuario.email);
    await card
      .getByRole("button", { name: "Enviar invitación", exact: true })
      .click();
    await expect(
      card.getByText("Invitación pendiente", { exact: true }),
    ).toBeVisible();
    const i = await db.invitacionEquipo.findFirstOrThrow({
      where: { profesionalId: f.empleados[0]!.profesional.id },
      orderBy: { creadaEn: "desc" },
    });
    const correo = await db.correoPendiente.findUniqueOrThrow({
      where: { claveIdempotencia: i.correoClave },
    });
    const enlace = correo.texto!.match(/\/invitaciones\/[a-f0-9]{64}/)![0];
    await empleado.goto(enlace);
    await expect(
      empleado.getByRole("link", { name: "Crear mi cuenta", exact: true }),
    ).toBeVisible();
    expect(
      (
        await db.profesional.findUniqueOrThrow({
          where: { id: f.empleados[0]!.profesional.id },
        })
      ).membresiaId,
    ).toBeNull();
    await acceder(empleadoContexto, usuario.email);
    await empleado.reload();
    await empleado
      .getByRole("button", { name: "Aceptar y unirme al equipo" })
      .click();
    await expect(empleado).toHaveURL(/panel\/resumen/);
    await page.bringToFront();
    await expect(
      card.getByText("Cuenta vinculada", { exact: true }),
    ).toBeVisible({ timeout: 25000 });
    await expect(empleado.locator('a[href="/panel/equipo"]')).toHaveCount(0);
    await empleado.screenshot({
      path: info.outputPath("resumen-empleado.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: info.outputPath("equipo-vinculado.png"),
      fullPage: true,
    });
    await empleado.bringToFront();
    await empleado.goto("/panel/clientes");
    await expect(
      empleado.getByText("Cliente 0", { exact: true }).first(),
    ).toBeVisible();
    expect(await empleado.content()).not.toContain(f.clientes[1]!.email!);
    expect(await empleado.content()).not.toContain("Nota histórica privada");
    expect(await empleado.content()).not.toContain("Nota del barbero 2");
    await empleado
      .getByText("Historial y notas de clientes", { exact: true })
      .click();
    await expect(
      empleado.getByRole("textbox", { name: "Mi nota privada", exact: true }),
    ).toHaveValue("Nota del barbero 1");
    const csv = await empleado.request.get(
      "/api/v1/clientes/exportar?formato=csv",
    );
    expect(csv.status()).toBe(200);
    expect(await csv.text()).not.toContain(f.clientes[1]!.email!);
    for (const ruta of [
      "/api/panel/mi-sitio",
      "/api/v1/archivos/carga",
      "/api/v1/clientes/importacion/confirmar",
      "/api/v1/compras/importacion/confirmar",
      "/api/v1/facturacion/suscripciones/checkout",
      "/api/v1/facturacion/suscripciones/renovacion",
    ]) {
      const r = await empleado.request.post(ruta, {
        headers: { Origin: base },
        data: { activa: false },
      });
      expect(r.status(), ruta).toBe(403);
    }
    await empleado.goto("/panel/inventario");
    await empleado
      .locator("summary")
      .filter({ hasText: "Registrar consumo" })
      .click();
    await empleado.getByLabel("Cantidad", { exact: true }).fill("2");
    await empleado
      .getByLabel("Motivo", { exact: true })
      .fill("Uso para cortes del día");
    await empleado
      .getByRole("button", { name: "Registrar consumo", exact: true })
      .click();
    await expect(
      empleado.getByText("Centro: 8 unidades", { exact: true }),
    ).toBeVisible();
    await page.goto("/panel/actividad");
    await expect(
      page.getByText("Uso para cortes del día", { exact: false }),
    ).toBeVisible();
    await empleado.goto("/panel/mi-sitio");
    await expect(
      empleado.getByRole("link", { name: "Abrir mi enlace de reservas →" }),
    ).toHaveCount(2);
    expect(
      await empleado
        .getByRole("link", { name: "Abrir mi enlace de reservas →" })
        .first()
        .getAttribute("href"),
    ).toContain(`profesional=${f.empleados[0]!.profesional.id}`);
    await empleado.goto("/panel/compras");
    await empleado
      .getByText("Registrar compra recibida", { exact: true })
      .click();
    await empleado
      .getByLabel("Proveedor", { exact: true })
      .fill("Formulario sin enviar");
    await db.cliente.update({
      where: { id: f.clientes[0]!.id },
      data: { nombre: "Actualización remota" },
    });
    await expect
      .poll(async () => {
        await empleado.evaluate(() => window.dispatchEvent(new Event("focus")));
        return empleado.getByLabel("Proveedor", { exact: true }).inputValue();
      })
      .toBe("Formulario sin enviar");
    await db.suscripcion.update({
      where: { negocioId: f.negocio.id },
      data: { pruebaFinalizaEn: new Date(0) },
    });
    await empleado.reload();
    await expect(empleado.locator(".panel-franja-suscripcion")).toContainText(
      "Tus datos siguen a salvo",
    );
    await empleado
      .getByText("Registrar compra recibida", { exact: true })
      .click();
    await empleado.getByLabel("Cantidad", { exact: true }).fill("1");
    await empleado.getByLabel("Costo por unidad", { exact: true }).fill("100");
    await empleado
      .getByRole("button", { name: "Registrar compra", exact: true })
      .click();
    await expect(empleado).toHaveURL(/resumen\?acceso=solo-lectura/);
    expect(await db.compra.count({ where: { negocioId: f.negocio.id } })).toBe(
      0,
    );
    await db.suscripcion.update({
      where: { negocioId: f.negocio.id },
      data: { pruebaFinalizaEn: new Date(Date.now() + 86400000) },
    });
    await page.goto("/panel/equipo");
    await card.getByRole("button", { name: "Quitar acceso" }).click();
    await expect(
      card.getByText("Acceso revocado", { exact: true }),
    ).toBeVisible();
    expect((await empleado.request.get("/api/panel/cambios")).status()).toBe(
      403,
    );
    await empleado.goto("/panel/agenda");
    await expect(empleado).toHaveURL(/seleccionar-negocio/);
    await expect(
      empleado.getByText("Tu acceso al negocio ya no está disponible.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(await db.reserva.count({ where: { id: f.reserva.id } })).toBe(1);
    expect(errores).toEqual([]);
  } finally {
    try {
      await empleadoContexto.close();
    } finally {
      await f.limpiar();
    }
  }
});
