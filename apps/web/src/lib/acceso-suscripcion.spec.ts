/** Fronteras de vigencia, franja y recuperación sin consultar proveedores. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { avisoSuscripcion, correspondeRetirarSitio, DIA_MS, puedeRecuperarSitio, tieneAccesoOperativo } from "@turnos/config";

const ahora = new Date("2026-10-01T12:00:00Z");
const fecha = (dias: number) => new Date(ahora.getTime() + dias * DIA_MS);
const activa = { plan: "autogestionado", estado: "ACTIVA", proximoCobro: fecha(2), cancelarAlFinal: false };

test("la prueba avisa desde exactamente cinco días, sin depender de la renovación", () => {
  const prueba = { estado: "CONFIGURACION_GRATUITA", pruebaFinalizaEn: fecha(5), cancelarAlFinal: false };
  assert.equal(avisoSuscripcion({ ...prueba, pruebaFinalizaEn: new Date(fecha(5).getTime() + 1) }, ahora), null);
  const aviso = avisoSuscripcion(prueba, ahora);
  assert.equal(aviso?.tipo, "prueba");
  assert.equal(aviso?.texto, "Tu prueba termina en 5 días, 0 horas y 0 minutos.");
  assert.equal(aviso?.href, "/panel/planes");
});

test("el contador descompone días, horas y minutos y actualiza las fronteras", () => {
  const fin = new Date(ahora.getTime() + 2 * DIA_MS + 3 * 3_600_000 + 20 * 60_000);
  const prueba = { estado: "CONFIGURACION_GRATUITA", pruebaFinalizaEn: fin };
  assert.equal(avisoSuscripcion(prueba, ahora)?.texto, "Tu prueba termina en 2 días, 3 horas y 20 minutos.");
  assert.equal(avisoSuscripcion(prueba, new Date(ahora.getTime() + 60_000))?.texto, "Tu prueba termina en 2 días, 3 horas y 19 minutos.");
  assert.equal(avisoSuscripcion(prueba, new Date(fin.getTime() - 1))?.texto, "Tu prueba termina en 0 días, 0 horas y 1 minuto.");
  assert.equal(avisoSuscripcion(prueba, fin)?.tipo, "vencido");
  assert.equal(avisoSuscripcion(prueba, new Date(fin.getTime() + 1))?.tipo, "vencido");
});

test("el contador utiliza singular cuando queda un día, una hora y un minuto", () => {
  const prueba = { estado: "CONFIGURACION_GRATUITA", pruebaFinalizaEn: new Date(ahora.getTime() + DIA_MS + 3_600_000 + 60_000) };
  assert.equal(avisoSuscripcion(prueba, ahora)?.texto, "Tu prueba termina en 1 día, 1 hora y 1 minuto.");
});

test("la franja sólo avisa los últimos tres días con renovación desactivada", () => {
  assert.equal(avisoSuscripcion(activa, ahora), null);
  assert.equal(avisoSuscripcion({ ...activa, cancelarAlFinal: true, proximoCobro: fecha(3.001) }, ahora), null);
  for (const dias of [3, 2, 1, 0.1]) {
    const aviso = avisoSuscripcion({ ...activa, cancelarAlFinal: true, proximoCobro: fecha(dias) }, ahora);
    assert.equal(aviso?.tipo, "vencimiento");
    assert.match(aviso!.texto, new RegExp(String(Math.ceil(dias))));
    assert.equal(aviso?.accion, "Activar renovación");
  }
});

test("al vencer cambia el aviso y bloquea operaciones sin depender del worker", () => {
  for (const renovar of [true, false]) {
    const sub = { ...activa, cancelarAlFinal: renovar, proximoCobro: ahora };
    assert.equal(tieneAccesoOperativo(sub, ahora), false);
    assert.equal(avisoSuscripcion(sub, ahora)?.tipo, "vencido");
  }
  assert.equal(tieneAccesoOperativo(null, ahora), false);
  assert.equal(tieneAccesoOperativo({ estado: "ACTIVA" }, ahora), false);
  for (const estado of ["PAUSADA", "CANCELADA"]) assert.equal(tieneAccesoOperativo({ ...activa, estado }, ahora), false);
});

test("prueba y gracia se respetan sólo hasta su fecha exacta", () => {
  assert.equal(tieneAccesoOperativo({ estado: "CONFIGURACION_GRATUITA", pruebaFinalizaEn: fecha(1) }, ahora), true);
  assert.equal(tieneAccesoOperativo({ estado: "CONFIGURACION_GRATUITA", pruebaFinalizaEn: ahora }, ahora), false);
  assert.equal(tieneAccesoOperativo({ estado: "EN_GRACIA", graciaHasta: fecha(1) }, ahora), true);
  assert.equal(tieneAccesoOperativo({ estado: "EN_GRACIA", graciaHasta: ahora }, ahora), false);
});

test("retiro a treinta días del fin de prueba, nunca por un pago anterior", () => {
  assert.equal(correspondeRetirarSitio(fecha(-29.999), false, ahora), false);
  assert.equal(correspondeRetirarSitio(fecha(-30), false, ahora), true);
  assert.equal(correspondeRetirarSitio(fecha(-100), true, ahora), false);
  assert.equal(correspondeRetirarSitio(null, false, ahora), false);
});

test("sólo Plus y Pro pagos vigentes pueden recuperar el sitio", () => {
  for (const plan of ["autogestionado", "pro"]) assert.equal(puedeRecuperarSitio({ ...activa, plan }, ahora), true);
  for (const plan of ["PRUEBA", "otro"]) assert.equal(puedeRecuperarSitio({ ...activa, plan }, ahora), false);
  assert.equal(puedeRecuperarSitio({ ...activa, proximoCobro: ahora }, ahora), false);
  assert.equal(puedeRecuperarSitio({ ...activa, estado: "EN_GRACIA", graciaHasta: fecha(1) }, ahora), false);
});
