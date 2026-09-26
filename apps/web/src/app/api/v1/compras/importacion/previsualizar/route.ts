/** Previsualiza un CSV o Excel de productos para una compra. */
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { leerArchivoClientes } from "@/servicios/importacion-clientes.service";

export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud))
    return NextResponse.json(
      { mensaje: "Solicitud no válida." },
      { status: 403 },
    );
  if (superaLimiteDeclarado(solicitud, 5 * 1024 * 1024 + 128 * 1024))
    return NextResponse.json(
      { mensaje: "El archivo supera el límite de 5 MB." },
      { status: 413 },
    );
  if (!(await obtenerContextoApi()))
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  const archivo = (await solicitud.formData()).get("archivo");
  if (!(archivo instanceof File))
    return NextResponse.json(
      { mensaje: "Seleccioná un archivo para continuar." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await leerArchivoClientes(archivo));
  } catch (error) {
    return NextResponse.json(
      {
        mensaje:
          error instanceof Error
            ? error.message
            : "No pudimos leer el archivo.",
      },
      { status: 400 },
    );
  }
}
