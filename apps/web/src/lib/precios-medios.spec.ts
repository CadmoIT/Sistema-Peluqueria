/** Comprueba precios definitivos, redondeo y compatibilidad con cobros históricos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  precioMedio,
  descuentoNegocio,
  acuerdoCobro,
  precioServicio,
  validarMediosServicio,
  precioReservaMedio,
  ajusteFirmado,
} from "./precios-medios";

test("ajuste firmado convierte signos, porcentajes y pesos sin cambiar el precio base", () => {
  for (const unidad of ["PORCENTAJE", "PESOS"] as const) {
    assert.equal(ajusteFirmado(-10, unidad).tipo, "DESCUENTO");
    assert.equal(ajusteFirmado(10, unidad).tipo, "RECARGO");
    assert.equal(ajusteFirmado(0, unidad).tipo, "SIN_AJUSTE");
    assert.equal(
      precioServicio(1000, "EFECTIVO", {
        EFECTIVO: ajusteFirmado(-10, unidad),
      }).toNumber(),
      unidad === "PESOS" ? 990 : 900,
    );
  }
  assert.throws(() => ajusteFirmado(NaN, "PESOS"));
});
test("cada medio conserva su descuento o recargo independiente en porcentaje o pesos", () => {
  const reglas = validarMediosServicio({
    EFECTIVO: { tipo: "DESCUENTO", unidad: "PORCENTAJE", valor: 10 },
    TARJETA_EXTERNA: { tipo: "DESCUENTO", unidad: "PESOS", valor: 500 },
    MERCADO_PAGO: { tipo: "RECARGO", unidad: "PORCENTAJE", valor: 10 },
  });
  assert.equal(precioServicio(10000, "EFECTIVO", reglas).toString(), "9000");
  assert.equal(
    precioServicio(10000, "TARJETA_EXTERNA", reglas).toString(),
    "9500",
  );
  assert.equal(
    precioServicio(10000, "MERCADO_PAGO", reglas).toString(),
    "11000",
  );
  assert.equal(
    precioServicio("123.45", "MERCADO_PAGO", reglas).toString(),
    "135.8",
  );
  assert.equal(precioServicio(10000, "EFECTIVO", {}, 10).toString(), "10000");
  assert.equal(precioServicio(10000, "EFECTIVO", null, 10).toString(), "9000");
  assert.throws(() =>
    precioServicio(100, "EFECTIVO", {
      EFECTIVO: { tipo: "DESCUENTO", unidad: "PESOS", valor: 101 },
    }),
  );
  assert.throws(() =>
    validarMediosServicio({
      EFECTIVO: { tipo: "DESCUENTO", unidad: "PORCENTAJE", valor: 101 },
    }),
  );
});
test("turnos conservan precios reservados y suman ajustes por línea", () => {
  const reglas = {
    MERCADO_PAGO: { tipo: "RECARGO", unidad: "PESOS", valor: 50 },
  };
  const lineas = [1000, 2000].map((p) => ({
    precio: new Prisma.Decimal(p),
    servicio: { mediosPago: reglas },
  }));
  assert.equal(
    precioReservaMedio(
      new Prisma.Decimal(3000),
      lineas,
      "MERCADO_PAGO",
    ).toString(),
    "3100",
  );
  assert.throws(() =>
    acuerdoCobro(new Prisma.Decimal(3000), "MERCADO_PAGO", 0, {
      medio: "TARJETA_EXTERNA",
      precioBase: null,
      totalAcordado: null,
      descuentoEfectivo: null,
    }),
  );
});
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
