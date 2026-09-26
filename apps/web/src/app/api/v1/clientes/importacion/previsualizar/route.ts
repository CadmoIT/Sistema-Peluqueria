/** Previsualiza un CSV o Excel de clientes para que el usuario asocie sus columnas. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
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
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  }

  const datos = await solicitud.formData();
  const archivo = datos.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { mensaje: "Seleccioná un archivo para continuar." },
      { status: 400 },
    );
  }

  try {
    const previsualizacion = await leerArchivoClientes(archivo);
    return NextResponse.json(previsualizacion);
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No pudimos leer el archivo seleccionado.";
    return NextResponse.json({ mensaje }, { status: 400 });
  }
}
