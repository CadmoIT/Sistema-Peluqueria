/** Exporta sólo clientes del negocio autenticado sin datos ficticios ni filtros de archivo. */
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { prisma } from "@/lib/prisma";
import {
  coincideCliente,
  generarCsv,
  type DatosCliente,
} from "@/lib/clientes-archivo";
import { generarExcel } from "@/servicios/clientes-excel";
export async function GET(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto)
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  const query = new URL(solicitud.url).searchParams;
  const formato = query.get("formato") ?? "xlsx",    buscar = query.get("buscar") ?? "";
  if (
    !["xlsx", "csv"].includes(formato) ||
    buscar.length > 200 || query.has("plantilla")
  )
    return NextResponse.json(
      { mensaje: "Opciones de exportación no válidas." },
      { status: 400 },
    );
  const datos: DatosCliente[] = (
        await prisma.cliente.findMany({
          where: {
            negocioId: contexto.negocio.id,
          },
          select: { nombre: true, apellido: true, email: true, telefono: true },
          orderBy: { creadoEn: "desc" },
        })
      ).filter((cliente) => coincideCliente(cliente, buscar));
  const nombre = `clientes-${contexto.negocio.slug}-${new Date().toISOString().slice(0, 10)}`;
  const contenido =
    formato === "csv" ? generarCsv(datos) : await generarExcel(datos);
  return new Response(contenido, {
    headers: {
      "Content-Type":
        formato === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}.${formato}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
