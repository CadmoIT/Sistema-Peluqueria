/** Simula Google y Prisma para verificar permisos, reconexiones y reintentos seguros. */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { crearServicioGoogle } from "./index";
const entorno = {
  GOOGLE_CALENDAR_CLIENT_ID: "cliente-simulado",
  GOOGLE_CALENDAR_CLIENT_SECRET: "secreto-simulado",
  BETTER_AUTH_SECRET: "pruebas-no-utilizar-en-produccion",
  WEB_URL: "http://localhost:3000",
};
const respuesta = (contenido: unknown, status = 200) =>
  new Response(JSON.stringify(contenido), { status });
function escenario() {
  let conexion: Record<string, unknown> | null = null;
  let vinculo: Record<string, unknown> | null = null;
  const consultas: Array<{ url: string; init?: RequestInit }> = [];
  const bloques: Record<string, unknown>[] = [];
  let eventos: Record<string, unknown>[] = [];
  let modo = "normal";
  let tokenVencido = false;
  let errores = 0;
  const reserva = {
    id: "reserva-1",
    negocioId: "negocio",
    profesionalId: "persona",
    sedeId: "local",
    inicio: new Date("2026-09-20T16:00:00Z"),
    fin: new Date("2026-09-20T17:00:00Z"),
    estado: "CONFIRMADA",
    codigo: "TEST",
    negocio: { zonaHoraria: "America/Argentina/Buenos_Aires" },
    sede: { direccion: "Calle de prueba" },
    profesional: { nombre: "Ana" },
    cliente: {
      nombre: "Juan",
      apellido: "Pérez",
      email: "privado@ejemplo.test",
      telefono: "privado",
    },
    servicios: [{ servicio: { nombre: "Corte" } }],
    eventosGoogle: [] as Record<string, unknown>[],
  };
  const db = {
    negocio: {
      findUniqueOrThrow: async () => ({
        nombre: "Estudio de prueba",
        zonaHoraria: "America/Argentina/Buenos_Aires",
      }),
    },
    conexionGoogleCalendar: {
      findFirst: async () => conexion,
      findUnique: async () => conexion,
      findMany: async () => (conexion ? [conexion] : []),
      create: async ({ data }: { data: Record<string, unknown> }) =>
        (conexion = { id: "conexion", syncToken: null, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) =>
        (conexion = { ...conexion, ...data }),
    },
    eventoCalendarioExterno: {
      updateMany: async () => ({}),
      upsert: async ({ create }: { create: Record<string, unknown> }) => {
        bloques.push(create);
        return {};
      },
    },
    reserva: {
      findUnique: async () => ({
        ...reserva,
        eventosGoogle: vinculo ? [vinculo] : [],
      }),
      findMany: async () => [{ id: reserva.id }],
    },
    eventoReservaGoogle: {
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) =>
        (vinculo = vinculo
          ? { ...vinculo, ...update }
          : { id: "vinculo", ...create }),
      update: async ({ data }: { data: Record<string, unknown> }) =>
        (vinculo = { ...vinculo, ...data }),
    },
    $transaction: async (hacer: (tx: unknown) => unknown) => hacer(db),
  };
  const proveedor: typeof fetch = async (url, init) => {
    const valor = String(url);
    consultas.push({ url: valor, init });
    if (valor.includes("oauth2.googleapis.com"))
      return respuesta({ access_token: "token-simulado" });
    if (valor.endsWith("/calendars") && init?.method === "POST")
      return respuesta({ id: "calendario-separado" });
    if (
      valor.includes("/events?") ||
      (valor.endsWith("/events") && !init?.method)
    ) {
      if (modo === "permiso-revocado") return respuesta({}, 403);
      if (modo === "token-vencido" && !tokenVencido) {
        tokenVencido = true;
        return respuesta({}, 410);
      }
      return respuesta({
        items: eventos,
        nextSyncToken: "sync-token",
        timeZone: "America/Argentina/Buenos_Aires",
      });
    }
    if (init?.method === "POST" && valor.endsWith("/events")) {
      if (modo === "conflicto") return respuesta({}, 409);
      if (modo === "fallo-transitorio" && errores++ === 0)
        return respuesta({}, 503);
      return respuesta({ id: JSON.parse(String(init.body)).id });
    }
    return respuesta({});
  };
  const servicio = crearServicioGoogle(
    db as unknown as PrismaClient,
    entorno,
    proveedor,
  );
  return {
    servicio,
    consultas,
    bloques,
    eventos: (items: Record<string, unknown>[]) => {
      eventos = items;
    },
    reserva,
    modo: (valor: string) => {
      modo = valor;
    },
    conexion: () => conexion,
    vinculo: () => vinculo,
  };
}
test("sin credenciales indica no configurado y solicita sólo permiso de calendario separado", () => {
  const sinConfig = crearServicioGoogle({} as PrismaClient, {});
  assert.equal(sinConfig.googleCalendarConfigurado(), false);
  const s = escenario();
  const url = new URL(
    s.servicio.crearUrlGoogleCalendar({
      usuarioId: "u",
      negocioId: "negocio",
      sedeId: null,
      profesionalId: null,
      fecha: "2026-09-15",
      expira: Date.now() + 60000,
    }),
  );
  assert.equal(
    url.searchParams.get("scope"),
    "https://www.googleapis.com/auth/calendar.app.created",
  );
  const estado = url.searchParams.get("state")!;
  assert.equal(s.servicio.leerEstadoGoogle(estado)?.fecha, "2026-09-15");
  assert.equal(s.servicio.leerEstadoGoogle(estado + "alterado"), null);
});
test("conectar y reconectar reutiliza el calendario sin tocar primary", async () => {
  const s = escenario();
  const estado = {
    usuarioId: "u",
    negocioId: "negocio",
    sedeId: null,
    profesionalId: null,
    expira: Date.now() + 60000,
  };
  await s.servicio.guardarConexionGoogle(estado, {
    access_token: "simulado",
    refresh_token: "refresh",
  });
  await s.servicio.guardarConexionGoogle(estado, {
    access_token: "simulado",
    refresh_token: "refresh",
  });
  assert.equal(
    s.consultas.filter(
      (c) => c.url.endsWith("/calendars") && c.init?.method === "POST",
    ).length,
    1,
  );
  assert.equal(s.conexion()?.calendarioId, "calendario-separado");
  assert.equal(
    s.consultas.some((c) => c.url.includes("primary")),
    false,
  );
});
test("la exportación inicial, repetición y cambios mantienen un evento sin datos de contacto", async () => {
  const s = escenario();
  await s.servicio.guardarConexionGoogle(
    {
      usuarioId: "u",
      negocioId: "negocio",
      sedeId: null,
      profesionalId: null,
      expira: Date.now() + 60000,
    },
    { access_token: "simulado" },
  );
  await s.servicio.sincronizarTurnosGoogle("conexion");
  await s.servicio.sincronizarTurnosGoogle("conexion");
  assert.equal(
    s.consultas.filter(
      (c) => c.url.endsWith("/events") && c.init?.method === "POST",
    ).length,
    1,
  );
  const alta = s.consultas.find(
    (c) => c.url.endsWith("/events") && c.init?.method === "POST",
  )!;
  assert.equal(String(alta.init?.body).includes("privado"), false);
  s.reserva.inicio = new Date("2026-09-20T17:00:00Z");
  await s.servicio.sincronizarReservaEnGoogle("reserva-1");
  assert.equal(s.consultas.filter((c) => c.init?.method === "PATCH").length, 1);
  s.reserva.estado = "CANCELADA";
  await s.servicio.sincronizarReservaEnGoogle("reserva-1");
  await s.servicio.sincronizarReservaEnGoogle("reserva-1");
  assert.equal(
    s.consultas.filter((c) => c.init?.method === "DELETE").length,
    1,
  );
});
test("un fallo transitorio o conflicto usa el mismo identificador al reintentar", async () => {
  for (const modo of ["fallo-transitorio", "conflicto"]) {
    const s = escenario();
    await s.servicio.guardarConexionGoogle(
      {
        usuarioId: "u",
        negocioId: "negocio",
        sedeId: null,
        profesionalId: null,
        expira: Date.now() + 60000,
      },
      { access_token: "simulado" },
    );
    s.modo(modo);
    await s.servicio.sincronizarReservaEnGoogle("reserva-1");
    await s.servicio.sincronizarReservaEnGoogle("reserva-1");
    const ids = s.consultas
      .filter((c) => c.url.endsWith("/events") && c.init?.method === "POST")
      .map((c) => JSON.parse(String(c.init?.body)).id);
    assert.equal(new Set(ids).size, 1);
    assert.ok(s.vinculo());
  }
});
test("un token incremental vencido dispara una sincronización completa", async () => {
  const s = escenario();
  await s.servicio.guardarConexionGoogle(
    {
      usuarioId: "u",
      negocioId: "negocio",
      sedeId: null,
      profesionalId: null,
      expira: Date.now() + 60000,
    },
    { access_token: "simulado" },
  );
  s.modo("token-vencido");
  assert.equal(await s.servicio.sincronizarConexionGoogle("conexion"), true);
  assert.ok(s.consultas.some((c) => c.url.includes("syncToken=")));
  assert.ok(s.consultas.at(-1)?.url.includes("timeMin="));
});
test("importa horarios y días completos sin descripciones ni duplicar turnos propios", async () => {
  const s = escenario();
  await s.servicio.guardarConexionGoogle(
    {
      usuarioId: "u",
      negocioId: "negocio",
      sedeId: "local",
      profesionalId: null,
      expira: Date.now() + 60000,
    },
    { access_token: "simulado" },
  );
  s.eventos([
    {
      id: "externo",
      description: "Información privada",
      start: { dateTime: "2026-09-15T10:00:00-03:00" },
      end: { dateTime: "2026-09-15T11:00:00-03:00" },
    },
    {
      id: "dia-completo",
      start: { date: "2026-09-15" },
      end: { date: "2026-09-16" },
    },
    {
      id: "propio",
      extendedProperties: { private: { turnosRapidosReservaId: "reserva-1" } },
      start: { dateTime: "2026-09-15T10:00:00-03:00" },
      end: { dateTime: "2026-09-15T11:00:00-03:00" },
    },
    {
      id: "libre",
      transparency: "transparent",
      start: { dateTime: "2026-09-15T10:00:00-03:00" },
      end: { dateTime: "2026-09-15T11:00:00-03:00" },
    },
  ]);
  assert.equal(await s.servicio.sincronizarConexionGoogle("conexion"), true);
  assert.equal(s.bloques.length, 2);
  assert.equal(
    JSON.stringify(s.bloques).includes("Información privada"),
    false,
  );
  assert.equal(
    (s.bloques[1]?.inicio as Date).toISOString(),
    "2026-09-15T03:00:00.000Z",
  );
  assert.equal(
    (s.bloques[1]?.fin as Date).toISOString(),
    "2026-09-16T03:00:00.000Z",
  );
});
test("un permiso revocado devuelve error y no anuncia una sincronización exitosa", async () => {
  const s = escenario();
  await s.servicio.guardarConexionGoogle(
    {
      usuarioId: "u",
      negocioId: "negocio",
      sedeId: null,
      profesionalId: null,
      expira: Date.now() + 60000,
    },
    { access_token: "simulado" },
  );
  s.modo("permiso-revocado");
  assert.equal(await s.servicio.sincronizarConexionGoogle("conexion"), false);
  assert.equal(s.conexion()?.estado, "ERROR");
});
