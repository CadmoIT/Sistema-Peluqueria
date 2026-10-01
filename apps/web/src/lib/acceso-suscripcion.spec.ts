/** Fronteras de vigencia, franja y recuperación sin consultar proveedores. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { avisoSuscripcion, correspondeRetirarSitio, DIA_MS, puedeRecuperarSitio, tieneAccesoOperativo } from "@turnos/config";

const ahora = new Date("2026-10-01T12:00:00Z");
const fecha = (dias: number) => new Date(ahora.getTime() + dias * DIA_MS);
const activa = { plan: "autogestionado", estado: "ACTIVA", proximoCobro: fecha(2), cancelarAlFinal: false };

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
