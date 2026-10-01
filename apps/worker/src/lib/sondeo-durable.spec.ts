import assert from "node:assert/strict";
import { test } from "node:test";
import { crearSondeoDurable } from "./sondeo-durable.js";

test("el sondeo no se superpone cuando el procesamiento supera el intervalo", async () => {
  let terminar!: () => void;
  let llamadas = 0;
  const espera = new Promise<void>((resolve) => { terminar = resolve; });
  const sondear = crearSondeoDurable(async () => { llamadas++; await espera; }, () => {});
  const primera = sondear();
  await sondear(); await sondear();
  assert.equal(llamadas, 1);
  terminar(); await primera; await sondear();
  assert.equal(llamadas, 2);
});
test("un fallo libera el sondeo para el siguiente intento", async () => {
  let llamadas = 0; let errores = 0;
  const sondear = crearSondeoDurable(async () => { if (++llamadas === 1) throw new Error("Fallo simulado"); }, () => { errores++; });
  await sondear(); await sondear();
  assert.equal(llamadas, 2); assert.equal(errores, 1);
});
