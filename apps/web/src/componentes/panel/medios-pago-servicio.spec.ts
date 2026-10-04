/** Comprueba la presentación compacta y que editar no pierda ajustes guardados. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MediosPagoServicio } from "./medios-pago-servicio";
test("tres filas con ajuste firmado y unidad, sin selectores extra ni atajos", () => {
  const html = renderToStaticMarkup(
    createElement(MediosPagoServicio, {
      precio: 10000,
      inicial: {
        EFECTIVO: { tipo: "DESCUENTO", unidad: "PORCENTAJE", valor: 10 },
        TARJETA_EXTERNA: { tipo: "RECARGO", unidad: "PESOS", valor: 500 },
      },
    }),
  );
  assert.equal((html.match(/<select /g) ?? []).length, 3);
  assert.equal((html.match(/type="text"/g) ?? []).length, 3);
  assert.ok(html.includes('value="-10"'));
  assert.ok(html.includes('value="500"'));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes("<output"));
  assert.ok(html.includes("mediosPago"));
});
