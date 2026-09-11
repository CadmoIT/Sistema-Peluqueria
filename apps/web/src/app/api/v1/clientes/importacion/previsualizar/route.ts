/** Previsualiza un CSV o Excel de clientes para que el usuario asocie sus columnas. */
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { leerArchivoClientes } from "@/servicios/importacion-clientes.service";

export async function POST(solicitud: Request) {
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
