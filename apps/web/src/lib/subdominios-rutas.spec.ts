/** Comprueba la reescritura del host y de las rutas de sucursal sin afectar la raíz. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

test("reescribe negocio y sucursal sin capturar APIs ni dominio principal", () => {
  const anterior = process.env.PUBLIC_SITE_DOMAIN;
  try {
    process.env.PUBLIC_SITE_DOMAIN = "turnosrapidos.com.ar";
    for (const [ruta, destino] of [
      ["/", "/sitio/barberstudio"],
      ["/sucursal/sede123", "/sitio/barberstudio/sucursal/sede123"],
    ]) {
      const respuesta = middleware(
        new NextRequest(`https://barberstudio.turnosrapidos.com.ar${ruta}`),
      );
      assert.equal(
        new URL(respuesta.headers.get("x-middleware-rewrite")!).pathname,
        destino,
      );
    }
    for (const url of [
      "https://turnosrapidos.com.ar/",
      "https://barberstudio.turnosrapidos.com.ar/api/reservas-publicas",
      "https://barberstudio.turnosrapidos.com.ar/marca/logo.png",
    ])
      assert.equal(
        middleware(new NextRequest(url)).headers.get("x-middleware-rewrite"),
        null,
      );
  } finally {
    if (anterior === undefined) delete process.env.PUBLIC_SITE_DOMAIN;
    else process.env.PUBLIC_SITE_DOMAIN = anterior;
  }
});
