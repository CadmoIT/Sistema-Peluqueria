/** Resuelve la sesión y el negocio para rutas HTTP del mismo origen sin aceptar IDs externos. */
import "server-only";

import { headers } from "next/headers";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";

export async function obtenerContextoApi() {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });

  if (!sesion) return null;

  const membresia = await prisma.membresia.findFirst({
    where: {
      usuarioId: sesion.user.id,
      activo: true,
    },
    include: { negocio: true },
  });

  if (!membresia) return null;

  return {
    usuario: sesion.user,
    membresia,
    negocio: membresia.negocio,
  };
}
