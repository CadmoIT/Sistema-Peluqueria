/** Comprueba primitivas usadas para proteger el flujo de recuperación. */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cifrarDatoRecuperacion,
  compararHuellaSegura,
  crearHuella,
  descifrarDatoRecuperacion,
  evaluarLimiteEnvioRecuperacion,
  firmarPermisoSolicitud,
  generarCodigoRecuperacion,
  normalizarEmailRecuperacion,
  validarPermisoSolicitud,
} from "./seguridad-recuperacion";

test("normaliza el correo sin alterar el contenido significativo", () => {
  assert.equal(
    normalizarEmailRecuperacion("  Persona@Ejemplo.COM "),
    "persona@ejemplo.com",
  );
});

test("genera códigos de seis dígitos, conservando ceros iniciales", () => {
  for (let indice = 0; indice < 100; indice += 1) {
    assert.match(generarCodigoRecuperacion(), /^\d{6}$/);
  }
});

test("cifra y descifra los secretos de recuperación", () => {
  const secreto = "000123:token-secreto";
  assert.equal(
    descifrarDatoRecuperacion(cifrarDatoRecuperacion(secreto)),
    secreto,
  );
});

test("rechaza datos cifrados alterados", () => {
  const partes = cifrarDatoRecuperacion("secreto").split(".");
  partes[2] = `${partes[2]}x`;
  assert.throws(() => descifrarDatoRecuperacion(partes.join(".")));
});

test("compara huellas y valida permisos internos con vencimiento", () => {
  const emailHash = crearHuella("persona@ejemplo.com");
  const timestamp = 1_800_000_000_000;
  const permiso = `${timestamp}.${firmarPermisoSolicitud(emailHash, timestamp)}`;
  assert.equal(compararHuellaSegura(emailHash, emailHash), true);
  assert.equal(
    compararHuellaSegura(emailHash, crearHuella("otro@ejemplo.com")),
    false,
  );
  assert.equal(
    validarPermisoSolicitud(permiso, emailHash, timestamp + 60_000),
    true,
  );
  assert.equal(
    validarPermisoSolicitud(permiso, emailHash, timestamp + 121_000),
    false,
  );
  assert.equal(
    validarPermisoSolicitud(
      permiso,
      crearHuella("otro@ejemplo.com"),
      timestamp,
    ),
    false,
  );
});

test("aplica el enfriamiento de 60 segundos y el máximo de cinco envíos por hora", () => {
  const inicio = new Date("2026-09-29T12:00:00.000Z");
  const primerEnvio = evaluarLimiteEnvioRecuperacion(
    { ventanaDesde: null, envios: 0, ultimoEnvio: null },
    inicio,
  );
  assert.equal(primerEnvio.permitido, true);

  const enfriamiento = evaluarLimiteEnvioRecuperacion(
    { ventanaDesde: inicio, envios: 1, ultimoEnvio: inicio },
    new Date(inicio.getTime() + 30_000),
  );
  assert.equal(enfriamiento.permitido, false);
  assert.equal(enfriamiento.reintentarEn, 30);

  const limiteHora = evaluarLimiteEnvioRecuperacion(
    { ventanaDesde: inicio, envios: 5, ultimoEnvio: inicio },
    new Date(inicio.getTime() + 120_000),
  );
  assert.equal(limiteHora.permitido, false);
  assert.equal(limiteHora.reintentarEn, 58 * 60);

  const nuevaVentana = evaluarLimiteEnvioRecuperacion(
    { ventanaDesde: inicio, envios: 5, ultimoEnvio: inicio },
    new Date(inicio.getTime() + 60 * 60_000),
  );
  assert.equal(nuevaVentana.permitido, true);
});
