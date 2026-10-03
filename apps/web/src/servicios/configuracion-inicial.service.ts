/** Persiste el negocio inicial y vincula a la persona propietaria en una operación atómica. */
import "server-only";

import { Prisma, RolMembresia } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerNombreRubro } from "@/lib/registro-inicial";
import {
  asignarSubdominio,
  subdominioOcupado,
} from "./subdominio-negocio.service";
import { claveNombreNegocio } from "@/lib/subdominio-negocio";

export type DatosConfiguracionInicial = {
  nombreNegocio: string;
  tipoNegocio: string;
  cantidadLocales: number;
};

export async function buscarNegocioDelUsuario(usuarioId: string) {
  return prisma.membresia.findFirst({
    where: { usuarioId, activo: true },
    select: {
      negocio: {
        select: {
          id: true,
          nombre: true,
          slug: true,
          publicado: true,
          configuracion: true,
          suscripcion: {
            select: { estado: true, pruebaFinalizaEn: true },
          },
        },
      },
    },
  });
}

export async function crearConfiguracionInicial(
  usuarioId: string,
  datos: DatosConfiguracionInicial,
) {
  const membresiaExistente = await buscarNegocioDelUsuario(usuarioId);
  if (membresiaExistente) return membresiaExistente.negocio;

  const ahora = new Date();
  const finPrueba = new Date(ahora);
  finPrueba.setDate(finPrueba.getDate() + 7);

  for (let intento = 0; intento < 4; intento++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const slug = await buscarSlugDisponible(tx, datos.nombreNegocio);
          const subdominio = await asignarSubdominio(tx, datos.nombreNegocio);
          return tx.negocio.create({
            data: {
              nombre: datos.nombreNegocio,
              nombreClave: claveNombreNegocio(datos.nombreNegocio),
              subdominio,
              slug,
              publicado: true,
              configuracion: {
                configuracionInicialCompleta: true,
                rubro: obtenerNombreRubro(datos.tipoNegocio),
                tipoNegocio: datos.tipoNegocio,
                cantidadLocales: datos.cantidadLocales,
              },
              membresias: {
                create: { usuarioId, rol: RolMembresia.DUENO },
              },
              suscripcion: {
                create: {
                  plan: "PRUEBA",
                  precioMensual: 0,
                  pruebaIniciaEn: ahora,
                  pruebaFinalizaEn: finPrueba,
                },
              },
              configuracionSitio: {
                create: {
                  borrador: configuracionSitioInicial(datos.nombreNegocio),
                  publicada: configuracionSitioInicial(datos.nombreNegocio),
                  version: 1,
                  publicadaEn: ahora,
                },
              },
              sedes: {
                create: Array.from(
                  { length: datos.cantidadLocales },
                  (_, indice) => ({
                    nombre:
                      datos.cantidadLocales === 1
                        ? "Local principal"
                        : `Local ${indice + 1}`,
                    direccion: "",
                  }),
                ),
              },
            },
            select: { id: true, nombre: true, slug: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        intento < 3 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      )
        continue;
      throw error;
    }
  }
  throw new Error("No pudimos reservar la dirección del negocio.");
}

function configuracionSitioInicial(nombreNegocio: string) {
  return {
    titulo: nombreNegocio,
    descripcion: "Reservá tu próximo turno de forma simple y rápida.",
    colorTitulo: "#111111",
    colorSubtitulo: "#111111",
    colorPrincipal: "#111111",
    colorFondo: "#ffffff",
    colorTexto: "#111111",
    logoUrl: "",
    whatsapp: "",
    instagram: "",
    hero: [],
    secciones: ["servicios", "equipo", "contacto", "ubicacion"],
    versionSecciones: 2,
  };
}

async function buscarSlugDisponible(
  tx: Prisma.TransactionClient,
  nombreNegocio: string,
) {
  const base = normalizarSlug(nombreNegocio) || "mi-negocio";
  let candidato = base;
  let sufijo = 2;

  while (await subdominioOcupado(tx, candidato)) {
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
