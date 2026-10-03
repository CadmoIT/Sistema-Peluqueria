/** Resuelve el negocio activo y vuelve a validar la membresía en cada petición. */
import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
export {
  exigirPermisoEquipo,
  exigirSedeEquipo,
  exigirProfesionalEquipo,
} from "@/lib/permisos-equipo";

export const COOKIE_NEGOCIO = "turnos-negocio-activo";
export async function resolverContextoEquipo(usuario: {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}) {
  const seleccionado = (await cookies()).get(COOKIE_NEGOCIO)?.value;
  const membresias = await prisma.membresia.findMany({
    where: { usuarioId: usuario.id, activo: true },
    include: {
      negocio: { include: { suscripcion: true } },
      profesional: { include: { sedes: true } },
    },
    orderBy: { id: "asc" },
  });
  const disponibles = membresias.filter(
    (m) =>
      m.rol !== "PROFESIONAL" ||
      Boolean(usuario.emailVerified && m.aceptadaEn && m.profesional?.activo),
  );
  const membresia = seleccionado
    ? disponibles.find((m) => m.negocioId === seleccionado)
    : disponibles.length === 1
      ? disponibles[0]
      : null;
  if (!membresia) return null;
  return {
    usuario,
    membresia,
    negocio: membresia.negocio,
    identidad: {
      rol: membresia.rol,
      profesionalId: membresia.profesional?.id ?? null,
      sedeIds: membresia.profesional?.sedes.map((s) => s.sedeId) ?? [],
    },
  };
}
export type ContextoEquipo = NonNullable<
  Awaited<ReturnType<typeof resolverContextoEquipo>>
>;
