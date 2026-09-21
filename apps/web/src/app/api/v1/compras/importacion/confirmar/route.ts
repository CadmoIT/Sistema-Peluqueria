/** Confirma una importación de compra reutilizando la misma transacción del formulario manual. */
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { registrarCompra } from "@/app/panel/compras/acciones";

export async function POST(solicitud: Request) {
  if (!(await obtenerContextoApi())) return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  if (solicitud.headers.get("origin") && solicitud.headers.get("origin") !== new URL(solicitud.url).origin) return NextResponse.json({ mensaje: "Solicitud no válida." }, { status: 403 });
  try {
    const entrada = await solicitud.json() as { filas?: unknown; sedeId?: unknown; proveedor?: unknown };
    if (!Array.isArray(entrada.filas) || !entrada.filas.length) return NextResponse.json({ mensaje: "El archivo no contiene productos válidos." }, { status: 400 });
    const datos = new FormData();
    datos.set("items", JSON.stringify(entrada.filas));
    datos.set("sedeId", String(entrada.sedeId ?? ""));
    datos.set("proveedor", String(entrada.proveedor ?? ""));
    const resultado = await registrarCompra(datos);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
  } catch { return NextResponse.json({ mensaje: "No pudimos confirmar la compra." }, { status: 400 }); }
}
