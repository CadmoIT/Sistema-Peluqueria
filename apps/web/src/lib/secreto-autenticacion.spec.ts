/** Comprueba que producción nunca use la clave de autenticación de desarrollo. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerSecretoAutenticacion } from "./secreto-autenticacion";

test("falla de forma segura si falta una clave fuerte en producción", () => {
  assert.throws(
    () => obtenerSecretoAutenticacion({ NODE_ENV: "production" }),
    /BETTER_AUTH_SECRET/,
  );
  assert.throws(
    () =>
      obtenerSecretoAutenticacion({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "corta",
      }),
    /BETTER_AUTH_SECRET/,
  );
});

test("conserva una clave fuerte configurada y permite el fallback sólo fuera de producción", () => {
  assert.equal(
    obtenerSecretoAutenticacion({
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "x".repeat(32),
    }),
    "x".repeat(32),
  );
  assert.match(
    obtenerSecretoAutenticacion({ NODE_ENV: "development" }),
    /solo-desarrollo/,
  );
});
