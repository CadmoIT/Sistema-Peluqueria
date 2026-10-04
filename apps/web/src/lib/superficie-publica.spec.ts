/** El rewrite identifica el micrositio antes de renderizar el proveedor de carga. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
test("raíz y sucursal del subdominio anuncian su ruta pública resuelta", () => {
  const anterior = process.env.PUBLIC_SITE_DOMAIN;
  process.env.PUBLIC_SITE_DOMAIN = "turnosrapidos.com.ar";
  try {
    for (const ruta of ["/", "/sucursal/sede-demo"]) {
      const respuesta = middleware(
        new NextRequest(
          `https://carla-cicero-demo.turnosrapidos.com.ar${ruta}`,
        ),
      );
      const esperada = `/sitio/carla-cicero-demo${ruta === "/" ? "" : ruta}`;
      assert.equal(
        respuesta.headers.get("x-middleware-request-x-turnos-ruta"),
        esperada,
      );
      assert.ok(
        respuesta.headers.get("x-middleware-rewrite")?.endsWith(esperada),
      );
    }
    const landing = middleware(
      new NextRequest("https://turnosrapidos.com.ar/", {
        headers: { "x-turnos-ruta": "/sitio/falso" },
      }),
    );
    assert.equal(
      landing.headers.get("x-middleware-request-x-turnos-ruta"),
      "/",
    );
    const sitio = middleware(
      new NextRequest("https://turnosrapidos.com.ar/sitio/carla-cicero-demo"),
    );
    assert.equal(
      sitio.headers.get("x-middleware-request-x-turnos-ruta"),
      "/sitio/carla-cicero-demo",
    );
  } finally {
    if (anterior === undefined) delete process.env.PUBLIC_SITE_DOMAIN;
    else process.env.PUBLIC_SITE_DOMAIN = anterior;
  }
});
