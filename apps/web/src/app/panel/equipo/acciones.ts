/** Crea profesionales vinculados exclusivamente con el negocio autenticado. */
"use server";

import { revalidatePath } from "next/cache";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function crearProfesional(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const asignaciones = await obtenerAsignaciones(negocio.id, datos);

  await prisma.profesional.create({
    data: {
      negocioId: negocio.id,
      nombre: leerTexto(datos, "nombre"),
      apellido: textoOpcional(leerTexto(datos, "apellido")),
      especialidad: textoOpcional(leerTexto(datos, "especialidad")),
      biografia: textoOpcional(leerTexto(datos, "biografia")),
      foto: textoOpcional(leerTexto(datos, "foto")),
      sedes: {
        create: asignaciones.sedeIds.map((sedeId) => ({ sedeId })),
      },
      servicios: {
        create: asignaciones.servicioIds.map((servicioId) => ({ servicioId })),
      },
      horarios: {
        create: asignaciones.dias.map((diaSemana) => ({
          negocioId: negocio.id,
          sedeId: asignaciones.horarioSedeId!,
          diaSemana,
          comienza: asignaciones.comienza,
          termina: asignaciones.termina,
        })),
      },
    },
  });

  revalidatePath("/panel/equipo");
  revalidatePath(`/sitio/${negocio.slug}`);
}

export async function actualizarProfesional(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const profesional = await prisma.profesional.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (!profesional) throw new Error("El profesional no existe.");

  const asignaciones = await obtenerAsignaciones(negocio.id, datos);
  await prisma.$transaction([
    prisma.profesionalSede.deleteMany({ where: { profesionalId: id } }),
    prisma.profesionalServicio.deleteMany({ where: { profesionalId: id } }),
    prisma.horarioProfesional.deleteMany({ where: { profesionalId: id } }),
    prisma.profesional.update({
      where: { id },
      data: {
        nombre: leerTexto(datos, "nombre"),
        apellido: textoOpcional(leerTexto(datos, "apellido")),
        especialidad: textoOpcional(leerTexto(datos, "especialidad")),
        biografia: textoOpcional(leerTexto(datos, "biografia")),
        foto: textoOpcional(leerTexto(datos, "foto")),
        sedes: {
          create: asignaciones.sedeIds.map((sedeId) => ({ sedeId })),
        },
        servicios: {
          create: asignaciones.servicioIds.map((servicioId) => ({
            servicioId,
          })),
        },
        horarios: {
          create: asignaciones.dias.map((diaSemana) => ({
            negocioId: negocio.id,
            sedeId: asignaciones.horarioSedeId!,
            diaSemana,
            comienza: asignaciones.comienza,
            termina: asignaciones.termina,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/panel/equipo");
  revalidatePath("/panel/agenda");
  revalidatePath(`/sitio/${negocio.slug}`);
}

export async function alternarProfesional(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const profesional = await prisma.profesional.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (!profesional) return;

  await prisma.profesional.update({
    where: { id },
    data: { activo: !profesional.activo },
  });
  revalidatePath("/panel/equipo");
  revalidatePath(`/sitio/${negocio.slug}`);
}

async function obtenerAsignaciones(negocioId: string, datos: FormData) {
  const sedeSolicitadas = datos.getAll("sedeIds").map(String).filter(Boolean);
  const serviciosSolicitados = datos
    .getAll("servicioIds")
    .map(String)
    .filter(Boolean);
  const horarioSedeSolicitada = leerTexto(datos, "horarioSedeId");
  const dias = datos
    .getAll("dias")
    .map(Number)
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6);
  const comienza = horaValida(leerTexto(datos, "comienza"), "09:00");
  const termina = horaValida(leerTexto(datos, "termina"), "18:00");

  const [sedes, servicios] = await Promise.all([
    prisma.sede.findMany({
      where: {
        negocioId,
        activa: true,
        id: { in: sedeSolicitadas },
      },
      select: { id: true },
    }),
    prisma.servicio.findMany({
      where: {
        negocioId,
        activo: true,
        id: { in: serviciosSolicitados },
      },
      select: { id: true },
    }),
  ]);

  const sedeIds = sedes.map((sede) => sede.id);
  const horarioSedeId = sedeIds.includes(horarioSedeSolicitada)
    ? horarioSedeSolicitada
    : sedeIds[0];

  return {
    sedeIds,
    servicioIds: servicios.map((servicio) => servicio.id),
    horarioSedeId,
    dias: horarioSedeId && comienza < termina ? dias : [],
    comienza,
    termina,
  };
}

function horaValida(valor: string, alternativa: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor) ? valor : alternativa;
}
