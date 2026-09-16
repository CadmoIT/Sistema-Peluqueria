/** Muestra errores, duplicados y cambios previstos antes de confirmar una importación. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import {
  ErrorSolicitudImportacion,
  leerSolicitudImportacion,
  revisarImportacion,
} from "@/servicios/clientes-importacion.service";
export async function POST(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto)
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  if (
    solicitud.headers.get("origin") &&
    solicitud.headers.get("origin") !== new URL(solicitud.url).origin
  )
    return NextResponse.json(
      { mensaje: "Solicitud no válida." },
      { status: 403 },
    );
  try {
    const entrada = leerSolicitudImportacion(await solicitud.json());
    const revision = await revisarImportacion(
      prisma,
      contexto.negocio.id,
      entrada.filas,
      entrada.completar,
    );
    return NextResponse.json({
      ...revision,
      operaciones: revision.operaciones.map(({ fila, tipo, mensaje }) => ({
        fila,
        tipo,
        mensaje,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        mensaje:
          error instanceof ErrorSolicitudImportacion
            ? error.message
            : "No pudimos revisar el archivo.",
      },
      { status: 400 },
    );
  }
}
