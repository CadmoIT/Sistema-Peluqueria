/** Verifica que los reportes sumen caja real y respeten fechas y horarios locales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparMovimientos, rangoReporte, periodoReporte } from "./reportes-movimientos";
const zona = "America/Argentina/Buenos_Aires", ahora = new Date("2026-09-16T01:30:00Z");
test("el día argentino no cambia antes de medianoche y las semanas comienzan el lunes", () => {
  assert.equal(rangoReporte("dia", zona, ahora).fecha, "2026-09-15"); assert.equal(rangoReporte("dia", zona, ahora).desde.toISOString(), "2026-09-15T03:00:00.000Z");
  assert.equal(rangoReporte("semana", zona, ahora).fecha, "2026-09-14"); assert.equal(rangoReporte("mes", zona, new Date("2026-12-31T15:00Z")).siguiente, "2027-01-01"); assert.equal(periodoReporte("ajeno"), "mes");
});
test("agrupa por hora con ingresos, egresos y saldo excluyendo otros períodos y movimientos", () => {
  const grupos = agruparMovimientos([{ creadoEn: new Date("2026-09-15T16:10Z"), tipo: "INGRESO", monto: "1000.25" }, { creadoEn: new Date("2026-09-15T16:40Z"), tipo: "EGRESO", monto: 250 }, { creadoEn: new Date("2026-09-16T16:00Z"), tipo: "INGRESO", monto: 999 }, { creadoEn: new Date("2026-09-15T16:20Z"), tipo: "APERTURA", monto: 500 }], "dia", zona, ahora);
  assert.equal(grupos.length, 24); assert.deepEqual(grupos[13], { clave: "13:00", etiqueta: "13:00", ingresos: 1000.25, egresos: 250, saldo: 750.25 });
});
test("mes y semana muestran fechas agrupadas y ceros donde no hay movimientos", () => {
  const grupos = agruparMovimientos([{ creadoEn: new Date("2026-09-16T01:00Z"), tipo: "INGRESO", monto: 120 }], "semana", zona, ahora);
  assert.equal(grupos.length, 7); assert.equal(grupos[1]!.clave, "2026-09-15"); assert.equal(grupos[1]!.ingresos, 120); assert.equal(agruparMovimientos([], "mes", zona, ahora).length, 30);
});
