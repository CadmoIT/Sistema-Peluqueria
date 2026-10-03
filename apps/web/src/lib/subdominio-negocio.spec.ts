/** Verifica nombres automáticos, colisiones normalizadas y etiquetas DNS seguras. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baseSubdominio,
  claveNombreNegocio,
  subdominioValido,
} from "./subdominio-negocio";

test("compacta el nombre del negocio y reconoce homónimos", () => {
  assert.equal(baseSubdominio("Barber Studio"), "barberstudio");
  assert.equal(
    claveNombreNegocio("Clínica Áurea"),
    claveNombreNegocio("CLINICA aurea"),
  );
  assert.equal(
    claveNombreNegocio("Barber-Studio"),
    claveNombreNegocio("Barber Studio"),
  );
  assert.equal(baseSubdominio("你好"), "mi-negocio");
  assert.equal(baseSubdominio("a".repeat(80)).length, 50);
});

test("rechaza nombres internos, hosts completos y etiquetas inválidas", () => {
  for (const valor of [
    "www",
    "api",
    "mail",
    "panel",
    "admin",
    "localhost",
    "",
    "a",
    "-hola",
    "hola-",
    "a--b",
    "hola.com",
    "https://hola",
    "hola/local",
    "áurea",
    "UPPER",
    "a".repeat(64),
  ])
    assert.equal(subdominioValido(valor), false, valor);
  for (const valor of ["barberstudio", "barberstudio-2", "manly-barber", "ab"])
    assert.equal(subdominioValido(valor), true, valor);
});
