/** Verifica el agarre progresivo de la esquina y la continuidad del giro hacia el reverso. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calcularHojaCurvada, duracionGiroHoja } from "./cinematica-hoja";

test("el papel empieza plano y conserva su borde superior al doblar la esquina", () => {
  const plana = calcularHojaCurvada(0);
  const esquina = calcularHojaCurvada(0.15);
  assert.equal(plana.reverso, false);
  assert.notEqual(plana.frente, esquina.frente);
  assert.ok(esquina.frente.startsWith("M13 1H195Q207 1 207 13V"));
  assert.ok(esquina.transform.includes("rotateX(0deg)"));
});

test("el pliegue se curva continuamente, no cambia entre imágenes estáticas", () => {
  const formas = [0.05, 0.1, 0.2, 0.3].map((p) => calcularHojaCurvada(p));
  assert.equal(new Set(formas.map((forma) => forma.pliegue)).size, 4);
  assert.equal(new Set(formas.map((forma) => forma.transform)).size, 4);
});

test("muestra el dorso únicamente al superar la posición vertical", () => {
  assert.equal(calcularHojaCurvada(0.3).reverso, false);
  assert.equal(calcularHojaCurvada(0.65).reverso, true);
  assert.ok(calcularHojaCurvada(1).transform.includes("rotateX(190deg)"));
  assert.equal(duracionGiroHoja, 500);
});

test("limita el progreso a los extremos de la trayectoria", () => {
  assert.deepEqual(calcularHojaCurvada(-1), calcularHojaCurvada(0));
  assert.deepEqual(calcularHojaCurvada(2), calcularHojaCurvada(1));
});
