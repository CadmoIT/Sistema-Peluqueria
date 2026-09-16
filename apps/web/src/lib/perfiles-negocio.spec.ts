/** Verifica perfiles, compatibilidad antigua y permisos sin modificar cuentas ni datos reales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RUBROS_NEGOCIO } from "./registro-inicial";
import {
  PERFILES_NEGOCIO,
  obtenerPerfilNegocio,
  esTipoNegocio,
  puedeCambiarTipoNegocio,
  cambiosTipoNegocio,
} from "./perfiles-negocio";
import { obtenerIconoServicios } from "../componentes/panel/iconos-rubro";

test("cada rubro tiene un perfil completo y un icono de la biblioteca", () => {
  assert.equal(RUBROS_NEGOCIO.length, 17);
  assert.equal(Object.keys(PERFILES_NEGOCIO).length, 18);
  for (const { valor, nombre } of RUBROS_NEGOCIO) {
    const perfil = obtenerPerfilNegocio({ tipoNegocio: valor });
    assert.equal(perfil.tipoNegocio, valor);
    assert.ok(obtenerIconoServicios(perfil.iconoServicios));
    assert.ok(
      perfil.ejemploServicio &&
        perfil.ejemploCategoria &&
        perfil.ejemploNegocio,
    );
    assert.equal(cambiosTipoNegocio(valor).rubro, nombre);
  }
  assert.equal(
    obtenerPerfilNegocio({ tipoNegocio: "veterinarias" }).iconoServicios,
    "PawPrint",
  );
});

test("reconoce rubros antiguos sin tildes, con espacios o con su identificador", () => {
  for (const { valor, nombre } of RUBROS_NEGOCIO) {
    assert.equal(obtenerPerfilNegocio({ rubro: nombre }).tipoNegocio, valor);
    assert.equal(obtenerPerfilNegocio({ rubro: valor }).tipoNegocio, valor);
    const antiguo = `  ${nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()}  `;
    assert.equal(
      obtenerPerfilNegocio({ tipoNegocio: "", rubro: antiguo }).tipoNegocio,
      valor,
    );
  }
});

test("el identificador válido prevalece sobre el nombre antiguo", () => {
  assert.equal(
    obtenerPerfilNegocio({ tipoNegocio: "veterinarias", rubro: "Peluquería" })
      .tipoNegocio,
    "veterinarias",
  );
});

test("la configuración ausente, desconocida o mal formada usa el perfil general", () => {
  for (const datos of [
    null,
    undefined,
    [],
    "peluqueria",
    3,
    {},
    { rubro: "Otro" },
    { tipoNegocio: "inventado", rubro: "Peluquería" },
    { tipoNegocio: {} },
  ])
    assert.equal(obtenerPerfilNegocio(datos), PERFILES_NEGOCIO.general);
  assert.ok(obtenerIconoServicios(PERFILES_NEGOCIO.general.iconoServicios));
});

test("sólo Dueño y Administrador pueden cambiar a uno de los diez rubros", () => {
  for (const rol of ["DUENO", "ADMINISTRADOR"])
    assert.equal(puedeCambiarTipoNegocio(rol), true);
  for (const rol of ["PROFESIONAL", "", "admin", "inventado"])
    assert.equal(puedeCambiarTipoNegocio(rol), false);
  for (const { valor } of RUBROS_NEGOCIO)
    assert.equal(esTipoNegocio(valor), true);
  for (const valor of ["general", "Peluquería", "otro", "", null, {}])
    assert.equal(esTipoNegocio(valor), false);
});

test("el cambio sólo contiene las dos claves de rubro y no muta perfiles ni configuración", () => {
  const anterior = {
    tipoNegocio: "peluqueria",
    rubro: "Peluquería",
    cantidadLocales: 2,
    configuracionInicialCompleta: true,
    personalizado: { valor: 42 },
  };
  const copia = structuredClone(anterior);
  const cambios = cambiosTipoNegocio("veterinarias");
  assert.deepEqual(Object.keys(cambios).sort(), ["rubro", "tipoNegocio"]);
  const actualizado = { ...anterior, ...cambios };
  assert.equal(actualizado.cantidadLocales, anterior.cantidadLocales);
  assert.deepEqual(actualizado.personalizado, anterior.personalizado);
  assert.deepEqual(anterior, copia);
  assert.equal(PERFILES_NEGOCIO.peluqueria.ejemploServicio, "Corte de cabello");
});
