/** Comprueba que los enlaces públicos respeten el dominio de producción configurado. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { enlaceSitioPublico } from "./dominios-publicos";

test("usa la ruta local cuando no se configura dominio público", () => {
  const anterior = process.env.PUBLIC_SITE_DOMAIN;
  try {
    delete process.env.PUBLIC_SITE_DOMAIN;
    assert.equal(
      enlaceSitioPublico("estudio-aurora"),
      "/sitio/estudio-aurora",
    );
  } finally {
    if (anterior !== undefined) process.env.PUBLIC_SITE_DOMAIN = anterior;
  }
});

test("construye subdominios seguros para el dominio de producción", () => {
  const anterior = process.env.PUBLIC_SITE_DOMAIN;
  try {
    process.env.PUBLIC_SITE_DOMAIN = "*.site.turnosrapidos.com.ar";
    assert.equal(
      enlaceSitioPublico("manly-barber-studio"),
      "https://manly-barber-studio.site.turnosrapidos.com.ar",
    );
  } finally {
    if (anterior !== undefined) process.env.PUBLIC_SITE_DOMAIN = anterior;
    else delete process.env.PUBLIC_SITE_DOMAIN;
  }
});

test("identifica sucursales por ruta y nunca agrega local-1 al negocio", () => {
  const anterior = process.env.PUBLIC_SITE_DOMAIN;
  try {
    process.env.PUBLIC_SITE_DOMAIN = "turnosrapidos.com.ar";
    assert.equal(enlaceSitioPublico("barberstudio"), "https://barberstudio.turnosrapidos.com.ar");
    assert.equal(enlaceSitioPublico("barberstudio", "sede123"), "https://barberstudio.turnosrapidos.com.ar/sucursal/sede123");
    delete process.env.PUBLIC_SITE_DOMAIN;
    assert.equal(enlaceSitioPublico("barberstudio", "sede123"), "/sitio/barberstudio/sucursal/sede123");
  } finally {
    if (anterior !== undefined) process.env.PUBLIC_SITE_DOMAIN = anterior;
    else delete process.env.PUBLIC_SITE_DOMAIN;
  }
});
