/** Devuelve una versión sin importes, clientes ni detalles de operaciones. */
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
export async function GET() {
  const c = await obtenerContextoApi();
  if (!c)
    return NextResponse.json(
      { mensaje: "Acceso no disponible." },
      { status: 403 },
    );
  return NextResponse.json(
    { negocioId: c.negocio.id, version: c.negocio.versionEquipo.toString() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
