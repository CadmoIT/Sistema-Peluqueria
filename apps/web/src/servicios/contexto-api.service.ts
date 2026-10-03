/** Resuelve la sesión y el negocio para rutas HTTP del mismo origen sin aceptar IDs externos. */
import "server-only";

import { headers } from "next/headers";
import { autenticacion } from "@/lib/autenticacion";
import { resolverContextoEquipo } from "./contexto-equipo.service";

export async function obtenerContextoApi() {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });

  if (!sesion) return null;

  return resolverContextoEquipo(sesion.user);
}
