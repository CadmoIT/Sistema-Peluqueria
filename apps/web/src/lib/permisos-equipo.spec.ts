/** Verifica permisos y privacidad sin depender de Next ni de una base de datos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  permiteEquipo,
  exigirSedeEquipo,
  exigirProfesionalEquipo,
  emailEquipoValido,
  normalizarEmailEquipo,
  detalleActividadPermitido,
  type IdentidadEquipo,
} from "./permisos-equipo";
test("el empleado opera sólo su agenda y sus locales; sitio e invitaciones son exclusivos del dueño", () => {
  const e: IdentidadEquipo = {
    rol: "PROFESIONAL",
    profesionalId: "p1",
    sedeIds: ["s1"],
  };
  for (const permiso of [
    "agenda",
    "clientes",
    "venta",
    "compra",
    "consumo",
  ] as const)
    assert.equal(permiteEquipo(e, permiso), true);
  assert.equal(permiteEquipo(e, "administrar"), false);
  assert.equal(permiteEquipo(e, "dueno"), false);
  assert.equal(permiteEquipo({ ...e, profesionalId: null }, "venta"), false);
  assert.equal(permiteEquipo({ ...e, rol: "ADMINISTRADOR" }, "dueno"), false);
  assert.equal(permiteEquipo({ ...e, rol: "DUENO" }, "dueno"), true);
  assert.throws(() => exigirSedeEquipo({ identidad: e }, "s2"));
  assert.throws(() => exigirProfesionalEquipo({ identidad: e }, "p2"));
});
test("normaliza email y mantiene privados los detalles de operaciones ajenas", () => {
  assert.equal(
    normalizarEmailEquipo("  Persona@Example.com "),
    "persona@example.com",
  );
  for (const email of ["", "sin-arroba", "x@y", "x @y.com"])
    assert.equal(emailEquipoValido(email), false);
  assert.equal(emailEquipoValido("persona@example.com"), true);
  const e: IdentidadEquipo = {
    rol: "PROFESIONAL",
    profesionalId: "p1",
    sedeIds: ["s1"],
  };
  assert.equal(
    detalleActividadPermitido(e, {
      profesionalId: "p2",
      visibilidad: "PERSONAL",
    }),
    false,
  );
  assert.equal(
    detalleActividadPermitido(e, {
      profesionalId: null,
      visibilidad: "ADMINISTRACION",
    }),
    false,
  );
  assert.equal(
    detalleActividadPermitido(e, {
      profesionalId: "p1",
      visibilidad: "PERSONAL",
    }),
    true,
  );
  assert.equal(
    detalleActividadPermitido(e, {
      profesionalId: "p2",
      visibilidad: "COMPARTIDA",
    }),
    true,
  );
});
