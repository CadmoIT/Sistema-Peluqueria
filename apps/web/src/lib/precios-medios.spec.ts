/** Comprueba precios definitivos, redondeo y compatibilidad con cobros históricos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { precioMedio, descuentoNegocio, acuerdoCobro } from "./precios-medios";
test("efectivo descuenta 10%, tarjeta y Mercado Pago conservan base", () => {
  assert.equal(precioMedio(10000, "EFECTIVO", 10).toNumber(), 9000);
  for (const m of ["TARJETA_EXTERNA", "MERCADO_PAGO", "TRANSFERENCIA"])
    assert.equal(precioMedio(10000, m, 10).toNumber(), 10000);
  assert.equal(precioMedio("123.45", "EFECTIVO", 10).toString(), "111.11");
});
test("la regla inicial es cero y rechaza medios o descuentos inválidos", () => {
  for (const c of [
    null,
    {},
    { descuentoEfectivo: -1 },
    { descuentoEfectivo: 100 },
    { descuentoEfectivo: "10" },
  ])
    assert.equal(descuentoNegocio(c), 0);
  assert.equal(descuentoNegocio({ descuentoEfectivo: 10 }), 10);
  assert.throws(() => precioMedio(100, "OTRO", 10));
  for (const d of [-1, 100, NaN])
    assert.throws(() => precioMedio(100, "EFECTIVO", d));
});
test("un cobro parcial fija el precio, incluso si luego cambia la configuración", () => {
  const base = new Prisma.Decimal(10000);
  const primero = {
    medio: "EFECTIVO",
    precioBase: base,
    totalAcordado: new Prisma.Decimal(9000),
    descuentoEfectivo: new Prisma.Decimal(10),
  };
  assert.equal(
    acuerdoCobro(base, "EFECTIVO", 20, primero).total.toNumber(),
    9000,
  );
  assert.throws(() => acuerdoCobro(base, "TARJETA_EXTERNA", 20, primero));
  assert.throws(() =>
    acuerdoCobro(base, "EFECTIVO", 10, { ...primero, medio: "MERCADO_PAGO" }),
  );
});
test("los cobros antiguos conservan su total sin inventar descuentos", () => {
  const base = new Prisma.Decimal(10000);
  assert.equal(
    acuerdoCobro(base, "EFECTIVO", 10, {
      medio: "EFECTIVO",
      precioBase: null,
      totalAcordado: null,
      descuentoEfectivo: null,
    }).total.toNumber(),
    10000,
  );
});
