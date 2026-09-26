/** Verifica la protección contra solicitudes de escritura desde otros orígenes. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { esOrigenMismoSitio } from "./origen-solicitud";

function solicitud(
  origen: string | null,
  url = "https://turnosrapidos.com.ar/api",
) {
  return {
    url,
    headers: new Headers(origen ? { origin: origen } : {}),
  };
}

test("acepta el origen exacto aunque tenga una ruta", () => {
  assert.equal(
    esOrigenMismoSitio(solicitud("https://turnosrapidos.com.ar")),
    true,
  );
});

test("rechaza dominios parecidos, otros puertos y origen ausente", () => {
  assert.equal(
    esOrigenMismoSitio(solicitud("https://turnosrapidos.com.ar.evil")),
    false,
  );
  assert.equal(
    esOrigenMismoSitio(solicitud("https://turnosrapidos.com.ar:444")),
    false,
  );
  assert.equal(esOrigenMismoSitio(solicitud(null)), false);
});
