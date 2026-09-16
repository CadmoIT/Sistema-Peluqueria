/** Verifica que la importación conserve datos existentes, historial y compatibilidad. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planificarImportacion,
  type ClienteImportable,
} from "./clientes-importacion";
const existente: ClienteImportable = {
  id: "uno",
  nombre: "Ana",
  apellido: null,
  email: "ana@ejemplo.com.ar",
  telefono: null,
  archivadoEn: null,
};
test("reconoce teléfonos formateados y correos antiguos sin reemplazar su contenido", () => {
  const anterior = {
    ...existente,
    email: "ANA@EJEMPLO.COM.AR",
    telefono: "+54 11 1234-5678",
  };
  const revision = planificarImportacion(
    [{ telefono: "+541112345678", apellido: "Pérez" }],
    [anterior],
    true,
  );
  assert.equal(revision.creados, 0);
  assert.equal(revision.actualizados, 1);
  assert.equal(revision.operaciones[0]!.datos.telefono, anterior.telefono);
  assert.equal(revision.operaciones[0]!.datos.email, anterior.email);
});
test("sólo completa vacíos y omite duplicados cuando esa opción está desactivada", () => {
  const fila = {
    nombre: "Nombre distinto",
    apellido: "Pérez",
    email: existente.email,
    telefono: "1112345678",
  };
  const revision = planificarImportacion([fila], [existente], true);
  assert.equal(revision.actualizados, 1);
  assert.equal(revision.operaciones[0]!.datos.nombre, "Ana");
  assert.equal(revision.operaciones[0]!.datos.apellido, "Pérez");
  assert.equal(planificarImportacion([fila], [existente], false).omitidos, 1);
});
test("incluye fichas antiguas y rechaza conflictos de email y teléfono", () => {
  const archivado = { ...existente, archivadoEn: new Date() };
  const revision = planificarImportacion(
    [{ email: existente.email }],
    [archivado],
    true,
  );
  assert.equal(revision.omitidos, 1);
  assert.match(revision.operaciones[0]!.mensaje, /conserva/);
  const otro = {
    ...existente,
    id: "dos",
    email: "otro@ejemplo.com.ar",
    telefono: "1112345678",
  };
  assert.equal(
    planificarImportacion(
      [{ email: existente.email, telefono: otro.telefono }],
      [existente, otro],
      true,
    ).errores.length,
    1,
  );
});
test("revisa todas las filas antes de guardar y omite completados sin cambios", () => {
  const revision = planificarImportacion(
    [{ email: existente.email }, { nombre: "Juan" }, { email: "error" }],
    [existente],
    true,
  );
  assert.equal(revision.creados, 1);
  assert.equal(revision.omitidos, 1);
  assert.equal(revision.errores.length, 1);
});
