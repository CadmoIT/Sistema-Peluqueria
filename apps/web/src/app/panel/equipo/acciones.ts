/** Crea profesionales vinculados exclusivamente con el negocio autenticado. */
"use server";
import { mensajeErrorEquipo } from "@/lib/errores-equipo";

import {
  eliminarFicha,
  type ResultadoAccion,
} from "@/servicios/eliminacion-fichas.service";
import { revalidatePath } from "next/cache";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanelEditable as requerirContextoPanel } from "@/servicios/panel-datos.service";
import {
  invitarEquipo,
  cancelarInvitacionEquipo,
  revocarAccesoEquipo,
} from "@/servicios/invitaciones-equipo.service";
import { exigirPermisoEquipo, emailEquipoValido } from "@/lib/permisos-equipo";
import { invitacionesEquipoHabilitadas } from "@/servicios/invitaciones-equipo.service";
import type { ContextoEquipo } from "@/servicios/contexto-equipo.service";
import { registrarActividadEquipo } from "@/servicios/actividad-equipo.service";

export async function habilitarAgendaDueno(datos: FormData) {
  const c = await requerirContextoPanel();
  exigirPermisoEquipo(c, "dueno");
  const elegido = leerTexto(datos, "profesionalId");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Membresia" WHERE "id"=${c.membresia.id} FOR UPDATE`;
    if (
      await tx.profesional.findUnique({
        where: { membresiaId: c.membresia.id },
      })
    )
      return;
    let profesional;
    if (elegido) {
      await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${elegido} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
      profesional = await tx.profesional.findFirst({
        where: {
          id: elegido,
          negocioId: c.negocio.id,
          activo: true,
          membresiaId: null,
        },
      });
      if (!profesional)
        throw new Error("La ficha ya no está disponible para vincular.");
      if (
        await tx.invitacionEquipo.findFirst({
          where: { profesionalId: elegido, estado: "PENDIENTE" },
        })
      )
        throw new Error(
          "Cancelá la invitación de esta ficha antes de vincularla.",
        );
      const vinculo = await tx.profesional.updateMany({
        where: { id: elegido, membresiaId: null },
        data: { membresiaId: c.membresia.id },
      });
      if (vinculo.count !== 1) throw new Error("La ficha ya fue vinculada.");
    } else {
      profesional = await tx.profesional.create({
        data: {
          negocioId: c.negocio.id,
          nombre: c.usuario.name,
          membresiaId: c.membresia.id,
          activo: false,
        },
      });
    }
    await registrarActividadEquipo(tx, c, {
      accion: "VINCULAR_AGENDA_DUENO",
      recurso: "profesional",
      recursoId: profesional.id,
      profesionalId: profesional.id,
    });
  });
  for (const ruta of [
    "/panel/equipo",
    "/panel/agenda",
    "/panel/servicios",
    "/panel/resumen",
    "/panel/reportes",
    "/panel/caja",
  ])
    revalidatePath(ruta);
  return {
    ok: true,
    mensaje:
      "Tu agenda está habilitada. Editá tu ficha para asignar servicios, locales y horarios.",
  };
}

export async function crearProfesional(datos: FormData) {
  const contexto = await requerirContextoPanel();
  const { negocio } = contexto;
  const email = validarEmailInvitacion(contexto, datos);
  const asignaciones = await obtenerAsignaciones(negocio.id, datos);

  const profesional = await prisma.$transaction(async (tx) => {
    const creado = await tx.profesional.create({
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
    });

    await registrarActividadEquipo(tx, contexto, {
      accion: "CREAR_PROFESIONAL",
      recurso: "profesional",
      recursoId: creado.id,
    });
    return creado;
  });
  revalidatePath("/panel/equipo");
  revalidatePath(`/sitio/${negocio.slug}`);
  if (email) {
    try {
      await invitarEquipo(prisma, contexto, email, profesional.id);
    } catch (e) {
      return {
        ok: true,
        mensaje: `Profesional creado. No se envió la invitación: ${mensajeErrorEquipo(e)}`,
      };
    }
  }
  return {
    ok: true,
    mensaje: email
      ? "Profesional creado e invitación en cola."
      : "Profesional creado.",
  };
}

export async function actualizarProfesional(datos: FormData) {
  const contexto = await requerirContextoPanel();
  const { negocio } = contexto;
  const email = validarEmailInvitacion(contexto, datos);
  const id = leerTexto(datos, "id");
  const profesional = await prisma.profesional.findFirst({
    where: { id, negocioId: negocio.id },
  });

  if (!profesional) throw new Error("El profesional no existe.");

  const asignaciones = await obtenerAsignaciones(negocio.id, datos);
  await prisma.$transaction(async (tx) => {
    await tx.profesionalSede.deleteMany({ where: { profesionalId: id } });
    await tx.profesionalServicio.deleteMany({ where: { profesionalId: id } });
    await tx.horarioProfesional.deleteMany({ where: { profesionalId: id } });
    await tx.profesional.update({
      where: { id },
      data: {
        nombre: leerTexto(datos, "nombre"),
        apellido: textoOpcional(leerTexto(datos, "apellido")),
        especialidad: textoOpcional(leerTexto(datos, "especialidad")),
        biografia: textoOpcional(leerTexto(datos, "biografia")),
        foto: textoOpcional(leerTexto(datos, "foto")),
        activo: datos.get("activo") === "on",
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
    });
    await registrarActividadEquipo(tx, contexto, {
      accion: "ACTUALIZAR_PROFESIONAL",
      recurso: "profesional",
      recursoId: id,
    });
  });

  revalidatePath("/panel/equipo");
  revalidatePath("/panel/agenda");
  revalidatePath(`/sitio/${negocio.slug}`);

  if (email) await invitarEquipo(prisma, contexto, email, id);
}

export async function enviarInvitacion(
  datos: FormData,
): Promise<ResultadoAccion> {
  const c = await requerirContextoPanel("dueno");
  try {
    await invitarEquipo(
      prisma,
      c,
      leerTexto(datos, "email"),
      leerTexto(datos, "id"),
    );
    revalidatePath("/panel/equipo");
    return {
      ok: true,
      mensaje:
        "Invitación en cola. La cuenta se vinculará cuando la persona acepte.",
    };
  } catch (e) {
    return { ok: false, mensaje: mensajeErrorEquipo(e) };
  }
}
export async function cancelarInvitacion(datos: FormData) {
  const c = await requerirContextoPanel("dueno");
  await cancelarInvitacionEquipo(prisma, c, leerTexto(datos, "id"));
  revalidatePath("/panel/equipo");
}
export async function quitarAcceso(datos: FormData) {
  const c = await requerirContextoPanel("dueno");
  await revocarAccesoEquipo(prisma, c, leerTexto(datos, "id"));
  revalidatePath("/panel/equipo");
}

export async function eliminarProfesional(
  datos: FormData,
): Promise<ResultadoAccion> {
  const c = await requerirContextoPanel();
  const { negocio, membresia } = c;
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol))
    return {
      ok: false,
      mensaje: "Sólo el dueño o administrador puede eliminar fichas.",
    };
  try {
    const resultado = await eliminarFicha(
      prisma,
      negocio.id,
      "profesional",
      leerTexto(datos, "id"),
      c,
    );
    for (const ruta of [
      "equipo",
      "agenda",
      "resumen",
      "servicios",
      "caja",
      "reportes",
      "mi-sitio",
    ])
      revalidatePath(`/panel/${ruta}`);
    revalidatePath(`/sitio/${negocio.slug}`);
    return resultado;
  } catch {
    return { ok: false, mensaje: "No pudimos eliminar el profesional." };
  }
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

function validarEmailInvitacion(c: ContextoEquipo, datos: FormData) {
  const email = leerTexto(datos, "emailInvitacion").trim();
  if (email) {
    exigirPermisoEquipo(c, "dueno");
    if (!invitacionesEquipoHabilitadas())
      throw new Error("Las invitaciones todavía no están habilitadas.");
    if (!emailEquipoValido(email)) throw new Error("Ingresá un email válido.");
  }
  return email;
}
