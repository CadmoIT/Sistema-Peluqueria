/** Impide mezclar compradores reales y ficticios en la configuración. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerCorreoCompradorMercadoPago } from "./comprador-mercadopago";

test("sin configuración de prueba conserva el correo del usuario", () => {
  assert.equal(obtenerCorreoCompradorMercadoPago("cliente@example.com"), "cliente@example.com");
  assert.equal(obtenerCorreoCompradorMercadoPago("cliente@example.com", "  "), "cliente@example.com");
});

test("utiliza y normaliza el comprador ficticio configurado", () => {
  assert.equal(
    obtenerCorreoCompradorMercadoPago("cliente@example.com", " TEST_USER_8245448624673812218@testuser.com "),
    "test_user_8245448624673812218@testuser.com",
  );
});

test("rechaza un correo real configurado como comprador ficticio", () => {
  assert.throws(() => obtenerCorreoCompradorMercadoPago("cliente@example.com", "otro@example.com"));
});
