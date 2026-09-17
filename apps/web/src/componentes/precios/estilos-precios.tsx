/** Sincroniza los estilos de los iconos entre servidor y navegador. */
"use client";

import { type ReactNode, useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";

export function EstilosPrecios({ children }: { children: ReactNode }) {
  const [{ cache, vaciar }] = useState(() => {
    const cache = createCache({ key: "precios" });
    cache.compat = true;
    const insertar = cache.insert;
    let pendientes: string[] = [];

    cache.insert = (...argumentos) => {
      const [, estilo] = argumentos;
      if (cache.inserted[estilo.name] === undefined) {
        pendientes.push(estilo.name);
      }
      return insertar(...argumentos);
    };

    return {
      cache,
      vaciar: () => {
        const nombres = pendientes;
        pendientes = [];
        return nombres;
      },
    };
  });

  useServerInsertedHTML(() => {
    const nombres = vaciar();
    if (nombres.length === 0) return null;

    const estilos = nombres
      .map((nombre) => cache.inserted[nombre])
      .filter((estilo): estilo is string => typeof estilo === "string")
      .join("");

    return (
      <style
        data-emotion={`${cache.key} ${nombres.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: estilos }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
