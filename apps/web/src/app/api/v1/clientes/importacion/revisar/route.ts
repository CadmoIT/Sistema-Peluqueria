/** Muestra errores, duplicados y cambios previstos antes de confirmar una importación. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import {
  ErrorSolicitudImportacion,
  leerSolicitudImportacion,
  revisarImportacion,
} from "@/servicios/clientes-importacion.service";
export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud))
    return NextResponse.json(
      { mensaje: "Solicitud no válida." },
      { status: 403 },
    );
  if (superaLimiteDeclarado(solicitud, 2 * 1024 * 1024))
    return NextResponse.json(
      { mensaje: "La importación es demasiado grande." },
      { status: 413 },
    );
  const contexto = await obtenerContextoApi();
  if (!contexto)
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
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
