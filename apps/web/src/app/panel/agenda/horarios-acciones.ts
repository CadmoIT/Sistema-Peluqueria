/** Gestiona horarios y bloqueos exclusivamente del profesional autorizado. */
"use server";
import { mensajeErrorEquipo } from "@/lib/errores-equipo";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanelEditable } from "@/servicios/panel-datos.service";
import {
  guardarHorarioEquipo,
  bloquearAgendaEquipo,
} from "@/servicios/agenda-equipo.service";
import { exigirProfesionalEquipo } from "@/servicios/contexto-equipo.service";
import { registrarActividadEquipo } from "@/servicios/actividad-equipo.service";
import { fechaLocalAUtc } from "@/servicios/disponibilidad.service";
export async function guardarHorario(d: FormData) {
  const c = await requerirContextoPanelEditable("agenda");
  try {
    await guardarHorarioEquipo(
      prisma,
      c,
      String(d.get("profesionalId")),
      String(d.get("sedeId")),
      d.getAll("dias").map((x) => ({
        diaSemana: Number(x),
        comienza: String(d.get(`comienza:${x}`) ?? d.get("comienza")),
        termina: String(d.get(`termina:${x}`) ?? d.get("termina")),
      })),
    );
    revalidatePath("/panel/agenda");
    return { ok: true, mensaje: "Horario actualizado." };
  } catch (e) {
    return { ok: false, mensaje: mensajeErrorEquipo(e) };
  }
}
export async function bloquearHorario(d: FormData) {
  const c = await requerirContextoPanelEditable("agenda");
  const fecha = (campo: string) => {
    const v = String(d.get(campo));
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)
      ? fechaLocalAUtc(v.slice(0, 10), v.slice(11), c.negocio.zonaHoraria)
      : new Date(NaN);
  };
  try {
    await bloquearAgendaEquipo(prisma, c, {
      profesionalId: String(d.get("profesionalId")),
      inicio: fecha("inicio"),
      fin: fecha("fin"),
      motivo: String(d.get("motivo")),
    });
    revalidatePath("/panel/agenda");
    return { ok: true, mensaje: "Horario bloqueado." };
  } catch (e) {
    return { ok: false, mensaje: mensajeErrorEquipo(e) };
  }
}
export async function quitarBloqueo(d: FormData) {
  const c = await requerirContextoPanelEditable("agenda");
  const b = await prisma.bloqueoAgenda.findFirst({
    where: { id: String(d.get("id")), negocioId: c.negocio.id },
  });
  if (!b) throw new Error("El bloqueo no existe.");
  exigirProfesionalEquipo(c, b.profesionalId);
  await prisma.$transaction(async (tx) => {
    await tx.bloqueoAgenda.delete({ where: { id: b.id } });
    await registrarActividadEquipo(tx, c, {
      accion: "QUITAR_BLOQUEO",
      recurso: "profesional",
      recursoId: b.id,
      profesionalId: b.profesionalId,
    });
  });
  revalidatePath("/panel/agenda");
}
