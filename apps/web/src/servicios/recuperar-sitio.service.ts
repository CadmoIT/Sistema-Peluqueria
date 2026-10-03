/** Verifica nuevamente propietario, retiro y plan antes de restaurar publicación. */
import type { PrismaClient } from "@prisma/client";
import { puedeRecuperarSitio } from "@turnos/config";

export async function restaurarSitioRetirado(
  db: PrismaClient,
  negocioId: string,
  rol: string,
) {
  if (rol !== "DUENO")
    return {
      ok: false,
      mensaje: "Sólo el dueño o administrador puede recuperar el sitio.",
    };
  return db.$transaction(
    async (tx) => {
      const actual = await tx.negocio.findUniqueOrThrow({
        where: { id: negocioId },
        include: { suscripcion: true, configuracionSitio: true },
      });
      if (!actual.sitioRetiradoEn)
        return { ok: false, mensaje: "Tu sitio no necesita recuperarse." };
      if (!puedeRecuperarSitio(actual.suscripcion))
        return {
          ok: false,
          mensaje:
            "Tu sitio te está esperando. Activá Plus o Pro para recuperarlo con su misma dirección y diseño.",
        };
      if (!actual.configuracionSitio)
        return {
          ok: false,
          mensaje:
            "No encontramos la configuración guardada. Contactá a soporte.",
        };
      await tx.negocio.update({
        where: { id: actual.id },
        data: { sitioRetiradoEn: null, publicado: true },
      });
      return {
        ok: true,
        mensaje: "¡Tu sitio está de vuelta! Conserva su dirección y diseño.",
      };
    },
    { isolationLevel: "Serializable" },
  );
}
