/** Prueba conversiones horarias y límites de jornada sin depender del navegador. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estaDentroDelHorario,
  fechaLocalAUtc,
  sumarDias,
} from "./disponibilidad.service";

describe("disponibilidad", () => {
  it("convierte la hora argentina a UTC", () => {
    assert.equal(
      fechaLocalAUtc(
        "2026-09-14",
        "09:30",
        "America/Argentina/Buenos_Aires",
      ).toISOString(),
      "2026-09-14T12:30:00.000Z",
    );
  });

  it("acepta un turno dentro de la jornada y rechaza el que termina después", () => {
    const horarios = [{ diaSemana: 1, comienza: "09:00", termina: "10:00" }];
    assert.equal(
      estaDentroDelHorario(
        new Date("2026-09-14T12:00:00.000Z"),
        new Date("2026-09-14T12:30:00.000Z"),
        horarios,
        "America/Argentina/Buenos_Aires",
      ),
      true,
    );
    assert.equal(
      estaDentroDelHorario(
        new Date("2026-09-14T12:45:00.000Z"),
        new Date("2026-09-14T13:15:00.000Z"),
        horarios,
        "America/Argentina/Buenos_Aires",
      ),
      false,
    );
  });

  it("suma días al cruzar de mes", () => {
    assert.equal(sumarDias("2026-09-30", 1), "2026-10-01");
  });
});
