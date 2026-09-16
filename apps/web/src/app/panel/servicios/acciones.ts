/** Guarda sólo los campos del catálogo simple sin borrar información anterior ni cruzar negocios. */
"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
export type ResultadoServicio = { ok: boolean; mensaje: string };
function invalidarCatalogo(slug: string) {
  for (const ruta of [
    "/panel/servicios",
    "/panel/agenda",
    "/panel/equipo",
    "/panel/resumen",
    "/panel/mi-sitio",
    `/sitio/${slug}`,
  ])
    revalidatePath(ruta);
}
export async function guardarServicio(
  _anterior: ResultadoServicio,
  datos: FormData,
): Promise<ResultadoServicio> {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id"),
    nombre = leerTexto(datos, "nombre"),
    categoriaNombre = leerTexto(datos, "categoria") || "General";
  const precio = Number(datos.get("precio")),
    duracionMinutos = Number(datos.get("duracionMinutos")),
    porcentajeSena = Number(datos.get("porcentajeSena") ?? 0);
  if (nombre.length < 2 || nombre.length > 200 || categoriaNombre.length > 100)
    return {
      ok: false,
      mensaje: "Revisá el nombre y la categoría del servicio.",
    };
  if (
    ![precio, duracionMinutos, porcentajeSena].every(Number.isFinite) ||
    precio < 0 ||
    !Number.isInteger(duracionMinutos) ||
    duracionMinutos < 5 ||
    duracionMinutos > 1440 ||
    porcentajeSena < 0 ||
    porcentajeSena > 100
  )
    return {
      ok: false,
      mensaje: "Revisá el precio, la duración y el porcentaje de seña.",
    };
  try {
    await prisma.$transaction(async (tx) => {
      if (
        id &&
        !(await tx.servicio.findFirst({
          where: { id, negocioId: negocio.id },
          select: { id: true },
        }))
      )
        throw new Error("SERVICIO_NO_DISPONIBLE");
      const [profesionales, sedes] = await Promise.all([
        tx.profesional.findMany({
          where: { negocioId: negocio.id, activo: true },
          select: { id: true },
        }),
        tx.sede.findMany({
          where: { negocioId: negocio.id, activa: true },
          select: { id: true },
        }),
      ]);
      const elegir = (opciones: Array<{ id: string }>, campo: string) => {
        if (opciones.length <= 1) return opciones.map(({ id }) => id);
        const seleccionados = [
          ...new Set(datos.getAll(campo).map(String).filter(Boolean)),
        ];
        if (
          !seleccionados.length ||
          seleccionados.some(
            (id) => !opciones.some((opcion) => opcion.id === id),
          )
        )
          throw new Error("ASIGNACIONES_NO_VALIDAS");
        return seleccionados;
      };
      const profesionalIds = elegir(profesionales, "profesionalIds"),
        sedeIds = elegir(sedes, "sedeIds");
      const categoria = await tx.categoriaServicio.upsert({
        where: {
          negocioId_nombre: { negocioId: negocio.id, nombre: categoriaNombre },
        },
        update: {},
        create: { negocioId: negocio.id, nombre: categoriaNombre },
      });
      const campos = {
        nombre,
        categoriaId: categoria.id,
        precio: new Prisma.Decimal(precio),
        duracionMinutos,
        porcentajeSena: new Prisma.Decimal(porcentajeSena),
        profesionales: {
          create: profesionalIds.map((profesionalId) => ({ profesionalId })),
        },
        sedes: { create: sedeIds.map((sedeId) => ({ sedeId })) },
      };
      if (id) {
        await tx.profesionalServicio.deleteMany({ where: { servicioId: id } });
        await tx.servicioSede.deleteMany({ where: { servicioId: id } });
        await tx.servicio.update({ where: { id }, data: campos });
      } else
        await tx.servicio.create({
          data: { negocioId: negocio.id, ...campos },
        });
    });
    invalidarCatalogo(negocio.slug);
    return {
      ok: true,
      mensaje: id ? "Servicio actualizado." : "Servicio creado.",
    };
  } catch (error) {
    return {
      ok: false,
      mensaje:
        error instanceof Error && error.message === "ASIGNACIONES_NO_VALIDAS"
          ? "Seleccioná los profesionales y locales donde se ofrece el servicio."
          : "No pudimos guardar el servicio. Revisá los datos e intentá nuevamente.",
    };
  }
}
export async function alternarServicio(
  _anterior: ResultadoServicio,
  datos: FormData,
): Promise<ResultadoServicio> {
  const { negocio } = await requerirContextoPanel();
  try {
    const id = leerTexto(datos, "id");
    const servicio = await prisma.servicio.findFirst({
      where: { id, negocioId: negocio.id },
      select: { activo: true },
    });
    if (!servicio)
      return { ok: false, mensaje: "El servicio ya no está disponible." };
    await prisma.servicio.update({
      where: { id },
      data: { activo: !servicio.activo },
    });
    invalidarCatalogo(negocio.slug);
    return {
      ok: true,
      mensaje: servicio.activo
        ? "Servicio oculto de tu página."
        : "Servicio publicado.",
    };
  } catch {
    return {
      ok: false,
      mensaje: "No pudimos cambiar la visibilidad del servicio.",
    };
  }
}
