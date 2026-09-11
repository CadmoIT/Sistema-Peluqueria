/** Gestiona el catálogo y su visibilidad en el micrositio del negocio. */
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerNumero, leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function crearServicio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const categoriaNombre = leerTexto(datos, "categoria") || "General";
  const categoria = await prisma.categoriaServicio.upsert({
    where: {
      negocioId_nombre: {
        negocioId: negocio.id,
        nombre: categoriaNombre,
      },
    },
    update: {},
    create: {
      negocioId: negocio.id,
      nombre: categoriaNombre,
    },
  });

  const [profesionalIds, sedeIds] = await obtenerAsignaciones(
    negocio.id,
    datos,
  );

  await prisma.servicio.create({
    data: {
      negocioId: negocio.id,
      categoriaId: categoria.id,
      nombre: leerTexto(datos, "nombre"),
      descripcion: textoOpcional(leerTexto(datos, "descripcion")),
      imagen: textoOpcional(leerTexto(datos, "imagen")),
      precio: new Prisma.Decimal(Math.max(0, leerNumero(datos, "precio"))),
      duracionMinutos: Math.max(5, leerNumero(datos, "duracionMinutos", 30)),
      bufferMinutos: Math.max(0, leerNumero(datos, "bufferMinutos")),
      porcentajeSena: new Prisma.Decimal(
        Math.min(100, Math.max(0, leerNumero(datos, "porcentajeSena"))),
      ),
      profesionales: {
        create: profesionalIds.map((profesionalId) => ({ profesionalId })),
      },
      sedes: {
        create: sedeIds.map((sedeId) => ({ sedeId })),
      },
    },
  });

  revalidatePath("/panel/servicios");
  revalidatePath(`/sitio/${negocio.slug}`);
}

export async function actualizarServicio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const servicio = await prisma.servicio.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (!servicio) throw new Error("El servicio no existe.");

  const categoriaNombre = leerTexto(datos, "categoria") || "General";
  const [categoria, asignaciones] = await Promise.all([
    prisma.categoriaServicio.upsert({
      where: {
        negocioId_nombre: {
          negocioId: negocio.id,
          nombre: categoriaNombre,
        },
      },
      update: {},
      create: { negocioId: negocio.id, nombre: categoriaNombre },
    }),
    obtenerAsignaciones(negocio.id, datos),
  ]);
  const [profesionalIds, sedeIds] = asignaciones;

  await prisma.$transaction([
    prisma.profesionalServicio.deleteMany({ where: { servicioId: id } }),
    prisma.servicioSede.deleteMany({ where: { servicioId: id } }),
    prisma.servicio.update({
      where: { id },
      data: {
        categoriaId: categoria.id,
        nombre: leerTexto(datos, "nombre"),
        descripcion: textoOpcional(leerTexto(datos, "descripcion")),
        imagen: textoOpcional(leerTexto(datos, "imagen")),
        precio: new Prisma.Decimal(Math.max(0, leerNumero(datos, "precio"))),
        duracionMinutos: Math.max(5, leerNumero(datos, "duracionMinutos", 30)),
        bufferMinutos: Math.max(0, leerNumero(datos, "bufferMinutos")),
        porcentajeSena: new Prisma.Decimal(
          Math.min(100, Math.max(0, leerNumero(datos, "porcentajeSena"))),
        ),
        profesionales: {
          create: profesionalIds.map((profesionalId) => ({ profesionalId })),
        },
        sedes: {
          create: sedeIds.map((sedeId) => ({ sedeId })),
        },
      },
    }),
  ]);

  revalidatePath("/panel/servicios");
  revalidatePath("/panel/agenda");
  revalidatePath(`/sitio/${negocio.slug}`);
}

export async function alternarServicio(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const servicio = await prisma.servicio.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (servicio) {
    await prisma.servicio.update({
      where: { id },
      data: { activo: !servicio.activo },
    });
  }

  revalidatePath("/panel/servicios");
  revalidatePath(`/sitio/${negocio.slug}`);
}

async function obtenerAsignaciones(negocioId: string, datos: FormData) {
  const solicitadosProfesionales = datos
    .getAll("profesionalIds")
    .map(String)
    .filter(Boolean);
  const solicitadasSedes = datos.getAll("sedeIds").map(String).filter(Boolean);
  const [profesionales, sedes] = await Promise.all([
    prisma.profesional.findMany({
      where: {
        negocioId,
        activo: true,
        id: { in: solicitadosProfesionales },
      },
      select: { id: true },
    }),
    prisma.sede.findMany({
      where: {
        negocioId,
        activa: true,
        id: { in: solicitadasSedes },
      },
      select: { id: true },
    }),
  ]);

  return [
    profesionales.map((profesional) => profesional.id),
    sedes.map((sede) => sede.id),
  ] as const;
}
