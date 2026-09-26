/** Comprueba que el check depende de la carga real, sin mínimo decorativo de seis segundos. */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  avanzarCalendario,
  type TiempoCalendario,
} from "./linea-tiempo-calendario";
import { duracionGiroHoja } from "./cinematica-hoja";

const inicial: TiempoCalendario = {
  instante: 0,
  destino: null,
  confirmacion: null,
};

test("una vista lista inmediatamente confirma en enero", () => {
  assert.deepEqual(avanzarCalendario(inicial, 16, true), {
    instante: 0,
    destino: 0,
    confirmacion: 0,
  });
});

test("si carga a los dos segundos confirma dos hojas atrás, no espera diciembre", () => {
  const tiempo = avanzarCalendario({ ...inicial, instante: 2000 }, 16, true);
  assert.equal(tiempo.instante, 2000);
  assert.equal(tiempo.confirmacion, 0);
});

test("cada hoja tarda un segundo completo en girar hacia atrás", () => {
  assert.equal(duracionGiroHoja, 1000);
  let tiempo = inicial;
  while (tiempo.instante < duracionGiroHoja - 40)
    tiempo = avanzarCalendario(tiempo, 64, false);
  assert.equal(tiempo.instante, 960);
  const final = avanzarCalendario(tiempo, 40, true);
  assert.equal(final.instante, duracionGiroHoja);
  assert.equal(final.confirmacion, 0);
});

test("termina suavemente el giro ya iniciado y no comienza otro", () => {
  let tiempo = avanzarCalendario({ ...inicial, instante: 2160 }, 16, true);
  assert.equal(tiempo.destino, 3000);
  assert.equal(tiempo.confirmacion, null);
  while (tiempo.confirmacion === null)
    tiempo = avanzarCalendario(tiempo, 16, true);
  assert.equal(tiempo.instante, 3000);
  assert.equal(tiempo.confirmacion, 0);
  tiempo = avanzarCalendario(tiempo, 16, true);
  assert.equal(tiempo.instante, 3000);
  assert.equal(tiempo.confirmacion, 16);
});

test("no muestra el check durante una carga lenta y confirma al liberarla", () => {
  let tiempo = inicial;
  for (let i = 0; i < 500; i++) tiempo = avanzarCalendario(tiempo, 16, false);
  assert.ok(tiempo.instante > 5000);
  assert.equal(tiempo.confirmacion, null);
  assert.equal(avanzarCalendario(tiempo, 16, true).confirmacion, 0);
});
