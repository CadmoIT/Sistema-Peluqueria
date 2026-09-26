/** Confirma una importación de compra reutilizando la misma transacción del formulario manual. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { registrarCompra } from "@/app/panel/compras/acciones";

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
  if (!(await obtenerContextoApi()))
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  try {
    const entrada = (await solicitud.json()) as {
      filas?: unknown;
      sedeId?: unknown;
      proveedor?: unknown;
    };
    if (!Array.isArray(entrada.filas) || !entrada.filas.length)
      return NextResponse.json(
        { mensaje: "El archivo no contiene productos válidos." },
        { status: 400 },
      );
    const datos = new FormData();
    datos.set("items", JSON.stringify(entrada.filas));
    datos.set("sedeId", String(entrada.sedeId ?? ""));
    datos.set("proveedor", String(entrada.proveedor ?? ""));
    const resultado = await registrarCompra(datos);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { mensaje: "No pudimos confirmar la compra." },
      { status: 400 },
    );
  }
}
