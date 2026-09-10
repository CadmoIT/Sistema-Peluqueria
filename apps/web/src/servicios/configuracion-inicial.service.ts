/** Persiste el negocio inicial y vincula a la persona propietaria en una operación atómica. */
import "server-only";

import { RolMembresia } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerNombreRubro } from "@/lib/registro-inicial";

export type DatosConfiguracionInicial = {
  nombreNegocio: string;
  tipoNegocio: string;
  cantidadLocales: number;
};

export async function buscarNegocioDelUsuario(usuarioId: string) {
  return prisma.membresia.findFirst({
    where: { usuarioId, activo: true },
    select: { negocio: { select: { id: true, nombre: true, slug: true } } },
  });
}

export async function crearConfiguracionInicial(
  usuarioId: string,
  datos: DatosConfiguracionInicial,
) {
  const membresiaExistente = await buscarNegocioDelUsuario(usuarioId);
  if (membresiaExistente) return membresiaExistente.negocio;

  const slug = await buscarSlugDisponible(datos.nombreNegocio);
  return prisma.negocio.create({
    data: {
      nombre: datos.nombreNegocio,
      slug,
      configuracion: {
        configuracionInicialCompleta: true,
        rubro: obtenerNombreRubro(datos.tipoNegocio),
        tipoNegocio: datos.tipoNegocio,
        cantidadLocales: datos.cantidadLocales,
      },
      membresias: {
        create: { usuarioId, rol: RolMembresia.DUENO },
      },
    },
    select: { id: true, nombre: true, slug: true },
  });
}

async function buscarSlugDisponible(nombreNegocio: string) {
  const base = normalizarSlug(nombreNegocio) || "mi-negocio";
  let candidato = base;
  let sufijo = 2;

  while (await prisma.negocio.findUnique({ where: { slug: candidato } })) {
    candidato = `${base}-${sufijo}`;
    sufijo += 1;
  }

  return candidato;
}

function normalizarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
