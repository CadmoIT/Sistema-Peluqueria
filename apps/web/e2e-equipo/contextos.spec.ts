/** Comprueba cambios de negocio, registro nuevo y enlaces públicos sin usar proveedores externos. */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { crearEquipoPrueba } from "../pruebas/equipo-fixture";
import { invitarEquipo } from "../src/servicios/invitaciones-equipo.service";
const db = new PrismaClient(),
  password = "Clave-Exclusiva-Pruebas-2026",
  base = "http://localhost:3108";
test.afterAll(() => db.$disconnect());

test("agenda y cobro parcial son propios, contemplan la seña y completar no vuelve a cobrar", async ({
  page,
}) => {
  const f = await crearEquipoPrueba(db),
    e = f.empleados[0]!;
  try {
    await f.vincular(0);
    await f.vincular(1);
    await db.horarioProfesional.createMany({
      data: Array.from({ length: 7 }, (_, diaSemana) => ({
        negocioId: f.negocio.id,
        profesionalId: e.profesional.id,
        sedeId: f.sedes[0]!.id,
        diaSemana,
        comienza: "09:00",
        termina: "18:00",
      })),
    });
    const ajena = await db.reserva.create({
      data: {
        negocioId: f.negocio.id,
        sedeId: f.sedes[0]!.id,
        profesionalId: f.empleados[1]!.profesional.id,
        clienteId: f.clientes[1]!.id,
        codigo: "AJENA",
        estado: "CONFIRMADA",
        inicio: new Date("2040-01-02T16:00Z"),
        fin: new Date("2040-01-02T16:30Z"),
        total: 5000,
        sena: 0,
      },
    });
    await db.cuentaOAuth.create({
      data: {
        usuarioId: e.usuario.id,
        proveedor: "credential",
        cuentaProveedorId: e.usuario.id,
        contrasena: await hashPassword(password),
      },
    });
    expect(
      (
        await page.request.post("/api/autenticacion/sign-in/email", {
          headers: { Origin: base },
          data: { email: e.usuario.email, password },
        })
      ).ok(),
    ).toBeTruthy();
    const saldoAjeno = await page.request.get(
      `/api/panel/turnos/${ajena.id}/saldo`,
    );
    expect(saldoAjeno.status()).toBe(404);
    expect(await saldoAjeno.json()).toEqual({
      mensaje: "Turno no disponible.",
    });
    await page.goto("/panel/agenda?fecha=2040-01-02");
    expect(await page.content()).not.toContain("Cliente 1");
    await page
      .locator(".fc-event")
      .filter({ hasText: "Cliente 0" })
      .first()
      .click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText("Abonado: $200");
    await dialogo.getByLabel("Importe", { exact: true }).fill("300");
    await dialogo
      .getByRole("button", { name: "Registrar cobro", exact: true })
      .click();
    await expect(dialogo).toContainText("Pendiente: $500");
    expect(
      await db.cobroReserva.count({ where: { reservaId: f.reserva.id } }),
    ).toBe(1);
    await dialogo
      .getByRole("button", { name: "Completar", exact: true })
      .click();
    await expect(dialogo).toHaveCount(0);
    expect(
      (await db.reserva.findUniqueOrThrow({ where: { id: f.reserva.id } }))
        .estado,
    ).toBe("COMPLETADA");
    expect(
      await db.cobroReserva.count({ where: { reservaId: f.reserva.id } }),
    ).toBe(1);
    const saldo = await page.request.get(
      `/api/panel/turnos/${f.reserva.id}/saldo`,
    );
    expect((await saldo.json()).pendiente).toBe("500");
  } finally {
    await f.limpiar();
  }
});

test("una cuenta cambia de rol y negocio, sin arrastrar permisos ni perder el otro acceso", async ({
  page,
}) => {
  const f = await crearEquipoPrueba(db),
    e = f.empleados[0]!;
  try {
    await f.vincular(0);
    await db.membresia.create({
      data: { usuarioId: e.usuario.id, negocioId: f.otro.id, rol: "DUENO" },
    });
    await db.cuentaOAuth.create({
      data: {
        usuarioId: e.usuario.id,
        proveedor: "credential",
        cuentaProveedorId: e.usuario.id,
        contrasena: await hashPassword(password),
      },
    });
    const login = await page.request.post("/api/autenticacion/sign-in/email", {
      headers: { Origin: base },
      data: { email: e.usuario.email, password },
    });
    expect(login.ok()).toBeTruthy();
    await page.goto("/panel/resumen");
    await expect(page).toHaveURL(/seleccionar-negocio/);
    const altaSinContexto = await page.request.post(
      "/api/configuracion-inicial",
      {
        headers: { Origin: base },
        data: {},
      },
    );
    expect(altaSinContexto.status()).toBe(409);
    expect(Object.keys(await altaSinContexto.json())).toEqual(["mensaje"]);
    const elegir = async (nombre: string) => {
      await page.goto("/seleccionar-negocio");
      await page
        .locator("form")
        .filter({
          has: page.getByRole("heading", { name: nombre, exact: true }),
        })
        .getByRole("button", { name: "Entrar al negocio" })
        .click();
      await expect(page).toHaveURL(/panel\/resumen/);
    };
    await elegir(f.otro.nombre);
    await expect(
      page.getByRole("link", { name: "Equipo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Otro negocio · Dueño ▾" }),
    ).toBeVisible();
    await elegir(f.negocio.nombre);
    await expect(page.locator('a[href="/panel/equipo"]')).toHaveCount(0);
    const altaExistente = await page.request.post(
      "/api/configuracion-inicial",
      {
        headers: { Origin: base },
        data: {},
      },
    );
    const negocioDevuelto = await altaExistente.json();
    expect(negocioDevuelto.id).toBe(f.negocio.id);
    expect(negocioDevuelto).not.toHaveProperty("configuracion");
    const cookies = await page.context().cookies();
    expect(
      cookies.find((c) => c.name === "turnos-negocio-activo")?.httpOnly,
    ).toBe(true);
    expect(cookies.every((c) => c.domain === "localhost")).toBe(true);
    await page.context().addCookies([
      {
        name: "turnos-negocio-activo",
        value: "negocio-ajeno",
        url: base,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    expect((await page.request.get("/api/panel/cambios")).status()).toBe(403);
    await elegir(f.negocio.nombre);
    await db.membresia.updateMany({
      where: { usuarioId: e.usuario.id, negocioId: f.negocio.id },
      data: { activo: false },
    });
    await page.goto("/panel/resumen");
    await expect(page).toHaveURL(/seleccionar-negocio/);
    await expect(
      page.getByRole("heading", { name: f.negocio.nombre, exact: true }),
    ).toHaveCount(0);
    await elegir(f.otro.nombre);
    expect((await page.request.get("/api/panel/cambios")).status()).toBe(200);
  } finally {
    await f.limpiar();
  }
});

test("registrarse para una invitación no crea negocio y exige verificar antes de aceptar", async ({
  page,
}) => {
  const f = await crearEquipoPrueba(db);
  let nuevoId: string | undefined;
  const flag = process.env.CUENTAS_EQUIPO_HABILITADAS;
  process.env.CUENTAS_EQUIPO_HABILITADAS = "true";
  try {
    const email = `nuevo-${f.negocio.id}@example.com`,
      dueno = await f.contexto(f.dueno.id),
      antes = await db.negocio.count();
    const id = await invitarEquipo(
        db,
        dueno,
        email,
        f.empleados[2]!.profesional.id,
      ),
      i = await db.invitacionEquipo.findUniqueOrThrow({ where: { id } }),
      correo = await db.correoPendiente.findUniqueOrThrow({
        where: { claveIdempotencia: i.correoClave },
      }),
      enlace = correo.texto!.match(/\/invitaciones\/[a-f0-9]{64}/)![0];
    await page.goto(enlace);
    await expect(
      page.getByRole("link", { name: "Crear mi cuenta", exact: true }),
    ).toHaveAttribute("href", new RegExp("callbackURL="));
    const registro = await page.request.post(
      "/api/autenticacion/sign-up/email",
      {
        headers: { Origin: base },
        data: { name: "Empleado nuevo", email, password, callbackURL: enlace },
      },
    );
    expect(registro.ok(), await registro.text()).toBeTruthy();
    const u = await db.usuario.findUniqueOrThrow({ where: { email } });
    nuevoId = u.id;
    expect(u.emailVerificado).toBe(false);
    expect(await db.negocio.count()).toBe(antes);
    expect(await db.membresia.count({ where: { usuarioId: u.id } })).toBe(0);
    // Se simula únicamente la confirmación de email: su entrega real se comprueba antes del despliegue general.
    await db.usuario.update({
      where: { id: u.id },
      data: { emailVerificado: true },
    });
    const ingreso = await page.request.post(
      "/api/autenticacion/sign-in/email",
      { headers: { Origin: base }, data: { email, password } },
    );
    expect(ingreso.ok()).toBeTruthy();
    await page.goto(enlace);
    await page
      .getByRole("button", { name: "Aceptar y unirme al equipo" })
      .click();
    await expect(page).toHaveURL(/panel\/resumen/);
    expect(await db.negocio.count()).toBe(antes);
    expect(await db.membresia.count({ where: { usuarioId: u.id } })).toBe(1);
    await expect(page.locator('a[href="/panel/equipo"]')).toHaveCount(0);
  } finally {
    await f.limpiar();
    if (nuevoId) await db.usuario.delete({ where: { id: nuevoId } });
    if (flag === undefined) delete process.env.CUENTAS_EQUIPO_HABILITADAS;
    else process.env.CUENTAS_EQUIPO_HABILITADAS = flag;
  }
});

test("el sitio preselecciona al empleado pero permite otro, y rechaza profesionales inactivos o de otra sucursal", async ({
  page,
}) => {
  const f = await crearEquipoPrueba(db),
    p = f.empleados[0]!.profesional;
  try {
    const ruta = `/sitio/${f.negocio.slug}/sucursal/${f.sedes[0]!.id}?profesional=${p.id}`;
    await page.goto(ruta);
    await page
      .getByRole("button", { name: "Agregar Corte", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continuar con fecha y horario" })
      .click();
    await expect(
      page.locator(".reserva-integrada__opciones button.activo"),
    ).toContainText("Barbero 1");
    await page.getByRole("button", { name: "Barbero 2", exact: false }).click();
    await expect(
      page.getByRole("button", { name: "Cambiar profesional" }),
    ).toBeVisible();
    await db.profesional.update({
      where: { id: p.id },
      data: { activo: false },
    });
    const inactivo = await page.request.get(ruta);
    expect(inactivo.status()).toBe(404);
    const otraSede = await page.request.get(
      `/sitio/${f.negocio.slug}/sucursal/${f.sedes[1]!.id}?profesional=${f.empleados[1]!.profesional.id}`,
    );
    expect(otraSede.status()).toBe(404);
  } finally {
    await f.limpiar();
  }
});
