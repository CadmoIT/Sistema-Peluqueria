/** Guarda filas revisadas en una transacción sin reemplazar datos existentes. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import {
  ErrorSolicitudImportacion,
  leerSolicitudImportacion,
  revisarImportacion,
} from "@/servicios/clientes-importacion.service";
export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json(
      { mensaje: "Solicitud no válida." },
      { status: 403 },
    );
  }
  if (superaLimiteDeclarado(solicitud, 2 * 1024 * 1024)) {
    return NextResponse.json(
      { mensaje: "La importación es demasiado grande." },
      { status: 413 },
    );
  }
  const contexto = await obtenerContextoApi();
  if (!contexto)
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  try {
    const entrada = leerSolicitudImportacion(await solicitud.json());
    const resultado = await prisma.$transaction(
      async (tx) => {
        const revision = await revisarImportacion(
          tx,
          contexto.negocio.id,
          entrada.filas,
          entrada.completar,
        );
        for (const operacion of revision.operaciones) {
          const { nombre, apellido, email, telefono } = operacion.datos;
          if (operacion.tipo === "CREAR")
            await tx.cliente.create({
              data: {
                negocioId: contexto.negocio.id,
                nombre,
                apellido,
                email,
                telefono,
              },
            });
          if (operacion.tipo === "COMPLETAR")
            await tx.cliente.updateMany({
              where: {
                id: operacion.id,
                negocioId: contexto.negocio.id,
              },
              data: { nombre, apellido, email, telefono },
            });
        }
        const { creados, actualizados, omitidos, errores } = revision;
        await tx.auditoria.create({
          data: {
            negocioId: contexto.negocio.id,
            usuarioId: contexto.usuario.id,
            accion: "CLIENTES_IMPORTADOS",
            recurso: "Cliente",
            detalle: {
              creados,
              actualizados,
              omitidos,
              errores: errores.length,
            },
          },
        });
        return { creados, actualizados, omitidos, errores };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const concurrencia =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034";
    return NextResponse.json(
      {
        mensaje: concurrencia
          ? "Los clientes cambiaron mientras importabas. Revisá el archivo nuevamente."
          : error instanceof ErrorSolicitudImportacion
            ? error.message
            : "No pudimos importar los clientes.",
      },
      { status: concurrencia ? 409 : 400 },
    );
  }
}
