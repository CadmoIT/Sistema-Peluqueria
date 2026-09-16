/** Comprueba fechas, estados y rangos diarios sin depender de un navegador. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fechaValida,
  fechaEnZona,
  fechaVisual,
  semanaDe,
  cincoDiasDesde,
  grupoEstado,
  rangoDelDia,
  type EventoAgenda,
  type LocalAgenda,
  type ProfesionalAgenda,
} from "./agenda-modelo";
const zona = "America/Argentina/Buenos_Aires";
const local: LocalAgenda = {
  id: "local",
  nombre: "Local",
  horarios: [{ diaSemana: 1, abre: "09:00", cierra: "18:00", activo: true }],
};
const persona: ProfesionalAgenda = {
  id: "persona",
  nombre: "Ana",
  horarios: [
    { sedeId: "local", diaSemana: 1, comienza: "10:00", termina: "17:00" },
  ],
};
test("valida fechas y navega entre semanas, meses y años", () => {
  assert.equal(fechaValida("2026-02-30"), false);
  assert.equal(fechaValida("2028-02-29"), true);
  assert.equal(fechaValida("texto"), false);
  assert.deepEqual(semanaDe("2027-01-01"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
});

test("los cinco días consecutivos incluyen fines de semana y cruzan meses y años", () => {
  assert.deepEqual(cincoDiasDesde("2026-12-30"), [
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.deepEqual(cincoDiasDesde("2028-02-27"), [
    "2028-02-27",
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
    "2028-03-02",
  ]);
});
test("la fecha y hora visual siguen al negocio, no al huso del navegador", () => {
  assert.equal(
    fechaEnZona(new Date("2026-09-15T01:00:00Z"), zona),
    "2026-09-14",
  );
  assert.equal(
    fechaVisual("2026-09-15T16:00:00Z", zona),
    "2026-09-15T13:00:00Z",
  );
});
test("el rango cruza horarios del local y profesional y no oculta turnos existentes", () => {
  assert.deepEqual(rangoDelDia("2026-09-14", [persona], [local], [], zona), {
    minimo: "09:30:00",
    maximo: "17:30:00",
    cerrado: false,
  });
  const evento = {
    start: "2026-09-14T11:00:00Z",
    end: "2026-09-14T22:00:00Z",
  } as EventoAgenda;
  assert.deepEqual(
    rangoDelDia("2026-09-14", [persona], [local], [evento], zona),
    { minimo: "07:30:00", maximo: "19:30:00", cerrado: false },
  );
  assert.equal(
    rangoDelDia("2026-09-15", [persona], [local], [], zona).cerrado,
    true,
  );
});
test("agrupa todos los estados pendientes y conserva ausencia y bloqueos", () => {
  for (const e of ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO"])
    assert.equal(grupoEstado(e).id, "PENDIENTE");
  assert.equal(grupoEstado("AUSENTE").color, "#a22d32");
  assert.equal(grupoEstado("OCUPADO").id, "OCUPADO");
});
