/** Reserva direcciones públicas y limita su edición a negocios con nombres repetidos. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { tieneAccesoOperativo } from "@turnos/config";
import {
  baseSubdominio,
  claveNombreNegocio,
  subdominioValido,
} from "@/lib/subdominio-negocio";

export async function subdominioOcupado(
  tx: Prisma.TransactionClient,
  nombre: string,
  negocioId?: string,
) {
  const [negocio, sede, anterior] = await Promise.all([
    tx.negocio.findFirst({
      where: {
        ...(negocioId ? { id: { not: negocioId } } : {}),
        OR: [{ subdominio: nombre }, { slug: nombre }],
      },
      select: { id: true },
    }),
    tx.sede.findFirst({ where: { subdominio: nombre }, select: { id: true } }),
    tx.subdominioAnterior.findUnique({ where: { nombre } }),
  ]);
  return Boolean(
    negocio || sede || (anterior && anterior.negocioId !== negocioId),
  );
}

export async function asignarSubdominio(
  tx: Prisma.TransactionClient,
  nombre: string,
  negocioId?: string,
) {
  const base = baseSubdominio(nombre);
  let candidato = base;
  let sufijo = 2;
  while (
    !subdominioValido(candidato) ||
    (await subdominioOcupado(tx, candidato, negocioId))
  ) {
    candidato = `${base}-${sufijo++}`;
  }
  return candidato;
}

export async function cambiarSubdominio(
  db: PrismaClient,
  negocioId: string,
  rol: string,
  solicitado: string,
) {
  if (rol !== "DUENO")
    return {
      ok: false,
      mensaje: "Sólo el dueño o un administrador puede cambiar esta dirección.",
    };
  const nombre = solicitado.trim().toLowerCase();
  if (!subdominioValido(nombre))
    return {
      ok: false,
      mensaje:
        "Usá entre 2 y 63 letras minúsculas, números o guiones. Esa dirección no debe estar reservada.",
    };
  try {
    return await db.$transaction(
      async (tx) => {
        const negocio = await tx.negocio.findUnique({
          where: { id: negocioId },
          include: { suscripcion: true },
        });
        if (
          !negocio ||
          negocio.sitioRetiradoEn ||
          !tieneAccesoOperativo(negocio.suscripcion)
        )
          return {
            ok: false,
            mensaje:
              "Necesitás un sitio disponible y un plan o prueba vigente.",
          };
        const clave = claveNombreNegocio(negocio.nombre);
        const repetidos = await tx.negocio.count({
          where: { nombreClave: clave, id: { not: negocioId } },
        });
        if (!clave || !repetidos)
          return {
            ok: false,
            mensaje:
              "Esta opción sólo está disponible si otro negocio tiene el mismo nombre.",
          };
        if (nombre === negocio.subdominio)
          return { ok: true, mensaje: "La dirección ya está guardada." };
        if (await subdominioOcupado(tx, nombre, negocioId))
          return {
            ok: false,
            mensaje: "Esa dirección ya está ocupada. Elegí otra.",
          };
        if (negocio.subdominio)
          await tx.subdominioAnterior.upsert({
            where: { nombre: negocio.subdominio },
            create: { nombre: negocio.subdominio, negocioId },
            update: {},
          });
        await tx.negocio.update({
          where: { id: negocioId },
          data: { subdominio: nombre },
        });
        return {
          ok: true,
          mensaje:
            "Tu dirección quedó actualizada. Los enlaces anteriores siguen funcionando.",
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    )
      return {
        ok: false,
        mensaje:
          "La dirección está siendo reservada. Probá otra o intentá nuevamente.",
      };
    throw error;
  }
}
