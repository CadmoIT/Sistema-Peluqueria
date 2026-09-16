/** Comprueba cuándo corresponde avisar y cuándo una reserva deja de ser válida. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  correspondeRecordatorio,
  hayConsentimientoWhatsapp,
  turnoSigueVigente,
  UN_DIA_MS,
} from "./avisos-reglas.js";

const ahora = new Date("2026-09-14T12:00:00.000Z");
const inicio = new Date("2026-09-16T12:00:00.000Z");

test("el recordatorio sólo se programa si faltaban más de 24 horas al reservar", () => {
  assert.equal(correspondeRecordatorio(ahora, inicio), true);
  assert.equal(correspondeRecordatorio(new Date(inicio.getTime() - UN_DIA_MS), inicio), false);
});

test("una reprogramación o cancelación invalida el aviso anterior", () => {
  assert.equal(turnoSigueVigente("CONFIRMADA", inicio, inicio, "RECORDATORIO", ahora), true);
  assert.equal(turnoSigueVigente("CANCELADA", inicio, inicio, "RECORDATORIO", ahora), false);
  assert.equal(turnoSigueVigente("CONFIRMADA", new Date(inicio.getTime() + 3_600_000), inicio, "RECORDATORIO", ahora), false);
});

test("WhatsApp exige PRO activo, teléfono y consentimiento expreso", () => {
  assert.equal(hayConsentimientoWhatsapp("pro", "ACTIVA", true, ahora, "+541155551234"), true);
  assert.equal(hayConsentimientoWhatsapp("autogestionado", "ACTIVA", true, ahora, "+541155551234"), false);
  assert.equal(hayConsentimientoWhatsapp("pro", "ACTIVA", false, null, "+541155551234"), false);
  assert.equal(hayConsentimientoWhatsapp("pro", "ACTIVA", true, ahora, null), false);
});
