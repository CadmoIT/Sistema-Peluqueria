/** Invitaciones explícitas, verificadas, revocables y entregadas mediante la cola existente. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  emailEquipoValido,
  normalizarEmailEquipo,
} from "@/lib/permisos-equipo";
import { exigirPermisoEquipo } from "@/lib/permisos-equipo";
import type { ContextoEquipo } from "./contexto-equipo.service";
import { registrarActividadEquipo } from "./actividad-equipo.service";

export function invitacionesEquipoHabilitadas() {
  return process.env.CUENTAS_EQUIPO_HABILITADAS === "true";
}
export function hashInvitacion(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function invitarEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  emailEntrada: string,
  profesionalId: string,
) {
  exigirPermisoEquipo(c, "dueno");
  if (!invitacionesEquipoHabilitadas())
    throw new Error(
      "Las invitaciones estarán disponibles cuando finalice la habilitación del equipo.",
    );
  const email = normalizarEmailEquipo(emailEntrada);
  if (!emailEquipoValido(email)) throw new Error("Ingresá un email válido.");
  const token = randomBytes(32).toString("hex");
  const expiraEn = new Date(Date.now() + 7 * 86400_000);
  const base = new URL(process.env.WEB_URL ?? "http://localhost:3000");
  const enlace = new URL(`/invitaciones/${token}`, base).toString();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${profesionalId} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
    const profesional = await tx.profesional.findFirst({
      where: { id: profesionalId, negocioId: c.negocio.id },
      include: { membresia: true },
    });
    if (!profesional?.activo)
      throw new Error("El profesional no está disponible.");
    if (profesional.membresia?.activo)
      throw new Error("Este integrante ya tiene una cuenta vinculada.");
    const envios = await tx.invitacionEquipo.findMany({
      where: {
        profesionalId,
        creadaEn: { gte: new Date(Date.now() - 3600_000) },
      },
      orderBy: { creadaEn: "desc" },
    });
    if (
      envios.length >= 5 ||
      (envios[0] && Date.now() - envios[0].creadaEn.getTime() < 60_000)
    )
      throw new Error(
        "Esperá antes de reenviar. Se permite un envío por minuto y hasta cinco por hora.",
      );
    await cancelarPendientes(tx, c.negocio.id, profesionalId);
    const correoClave = `equipo-${randomBytes(16).toString("hex")}`;
    const invitacion = await tx.invitacionEquipo.create({
      data: {
        negocioId: c.negocio.id,
        profesionalId,
        email,
        tokenHash: hashInvitacion(token),
        creadoPorId: c.usuario.id,
        expiraEn,
        correoClave,
      },
    });
    const nombre = escapar(c.negocio.nombre);
    await tx.correoPendiente.create({
      data: {
        destinatario: email,
        asunto: `Te invitan al equipo de ${c.negocio.nombre}`,
        claveIdempotencia: correoClave,
        expiraEn,
        texto: `${c.negocio.nombre} te invita a trabajar con tu propia cuenta. Creá una cuenta o ingresá con ${email} y aceptá la invitación: ${enlace}\nEl enlace vence en siete días. Si no reconocés esta invitación, ignorala.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#19324b"><h1>Sumate a ${nombre}</h1><p>Te invitaron a gestionar tu agenda y tus operaciones con una cuenta personal de Turnos Rápidos.</p><p><a href="${escapar(enlace)}" style="display:inline-block;padding:14px 24px;background:#146b82;color:white;border-radius:24px;text-decoration:none">Crear mi cuenta y unirme</a></p><p>¿Ya tenés cuenta? Ingresá con ${escapar(email)} y aceptá. El enlace vence en siete días.</p><small>Si no reconocés al negocio, podés ignorar este mensaje.</small></div>`,
      },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "INVITAR_EQUIPO",
      recurso: "profesional",
      recursoId: profesionalId,
    });
    return invitacion.id;
  });
}
async function cancelarPendientes(
  tx: Prisma.TransactionClient,
  negocioId: string,
  profesionalId: string,
) {
  const anteriores = await tx.invitacionEquipo.findMany({
    where: { negocioId, profesionalId, estado: "PENDIENTE" },
    select: { id: true, correoClave: true },
  });
  await tx.correoPendiente.updateMany({
    where: {
      claveIdempotencia: { in: anteriores.map((i) => i.correoClave) },
      estado: { not: "ENVIADO" },
    },
    data: { expiraEn: new Date(0) },
  });
  await tx.invitacionEquipo.updateMany({
    where: { id: { in: anteriores.map((i) => i.id) } },
    data: { estado: "REVOCADA" },
  });
}
export async function cancelarInvitacionEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  profesionalId: string,
) {
  exigirPermisoEquipo(c, "dueno");
  await db.$transaction(async (tx) => {
    const profesionales = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "Profesional" WHERE "id"=${profesionalId} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
    if (!profesionales.length)
      throw new Error("El integrante no está disponible.");
    await cancelarPendientes(tx, c.negocio.id, profesionalId);
    await registrarActividadEquipo(tx, c, {
      accion: "CANCELAR_INVITACION",
      recurso: "profesional",
      recursoId: profesionalId,
    });
  });
}
export async function revocarAccesoEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  profesionalId: string,
) {
  exigirPermisoEquipo(c, "dueno");
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${profesionalId} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
    const p = await tx.profesional.findFirst({
      where: { id: profesionalId, negocioId: c.negocio.id },
    });
    if (!p) throw new Error("El integrante no está disponible.");
    await cancelarPendientes(tx, c.negocio.id, profesionalId);
    if (p.membresiaId)
      await tx.membresia.updateMany({
        where: {
          id: p.membresiaId,
          negocioId: c.negocio.id,
          rol: "PROFESIONAL",
        },
        data: { activo: false },
      });
    await registrarActividadEquipo(tx, c, {
      accion: "REVOCAR_ACCESO",
      recurso: "profesional",
      recursoId: profesionalId,
    });
  });
}
export async function aceptarInvitacionEquipo(
  db: PrismaClient,
  token: string,
  usuario: { id: string; email: string; emailVerified: boolean },
) {
  if (!invitacionesEquipoHabilitadas())
    throw new Error("Las invitaciones todavía no están habilitadas.");
  if (!/^[a-f0-9]{64}$/.test(token) || !usuario.emailVerified)
    throw new Error("Verificá tu email antes de aceptar.");
  return db.$transaction(async (tx) => {
    const hash = hashInvitacion(token);
    const destino = await tx.invitacionEquipo.findUnique({
      where: { tokenHash: hash },
      select: { profesionalId: true },
    });
    if (!destino) throw new Error("La invitación ya no está disponible.");
    await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${destino.profesionalId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "InvitacionEquipo" WHERE "tokenHash"=${hash} FOR UPDATE`;
    const i = await tx.invitacionEquipo.findUnique({
      where: { tokenHash: hash },
      include: { profesional: { include: { membresia: true } } },
    });
    if (!i || i.email !== normalizarEmailEquipo(usuario.email))
      throw new Error("Ingresá con el email al que se envió la invitación.");
    if (
      i.estado === "ACEPTADA" &&
      i.aceptadaPorId === usuario.id &&
      i.profesional.membresia?.activo
    )
      return i.negocioId;
    if (
      i.estado !== "PENDIENTE" ||
      i.expiraEn <= new Date() ||
      !i.profesional.activo
    )
      throw new Error("La invitación venció o ya no está disponible.");
    await tx.$queryRaw`SELECT "id" FROM "Profesional" WHERE "id"=${i.profesionalId} FOR UPDATE`;
    const vinculado = await tx.profesional.findUniqueOrThrow({
      where: { id: i.profesionalId },
      include: { membresia: true },
    });
    if (vinculado.membresia?.activo)
      throw new Error("El integrante ya tiene una cuenta vinculada.");
    const anterior = await tx.membresia.findUnique({
      where: {
        usuarioId_negocioId: { usuarioId: usuario.id, negocioId: i.negocioId },
      },
      include: { profesional: true },
    });
    if (
      anterior &&
      (anterior.rol !== "PROFESIONAL" ||
        (anterior.profesional && anterior.profesional.id !== i.profesionalId))
    )
      throw new Error("Tu cuenta ya tiene otra función en este negocio.");
    const m = await tx.membresia.upsert({
      where: {
        usuarioId_negocioId: { usuarioId: usuario.id, negocioId: i.negocioId },
      },
      create: {
        usuarioId: usuario.id,
        negocioId: i.negocioId,
        rol: "PROFESIONAL",
        aceptadaEn: new Date(),
      },
      update: { activo: true, aceptadaEn: new Date() },
    });
    await tx.profesional.update({
      where: { id: i.profesionalId },
      data: { membresiaId: m.id },
    });
    await tx.invitacionEquipo.update({
      where: { id: i.id },
      data: {
        estado: "ACEPTADA",
        aceptadaEn: new Date(),
        aceptadaPorId: usuario.id,
      },
    });
    const cuenta = await tx.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
      select: { nombre: true },
    });
    await tx.auditoria.create({
      data: {
        negocioId: i.negocioId,
        usuarioId: usuario.id,
        actorNombre: cuenta.nombre,
        accion: "ACEPTAR_INVITACION",
        recurso: "profesional",
        recursoId: i.profesionalId,
      },
    });
    await tx.negocio.update({
      where: { id: i.negocioId },
      data: { versionEquipo: { increment: 1 } },
    });
    return i.negocioId;
  });
}
function escapar(texto: string) {
  return texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
