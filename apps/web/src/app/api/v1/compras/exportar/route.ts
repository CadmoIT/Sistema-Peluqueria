/** Exporta el historial de compras en CSV o Excel. */
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { prisma } from "@/lib/prisma";

export async function GET(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto) return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  const formato = new URL(solicitud.url).searchParams.get("formato") ?? "xlsx";
  if (!["xlsx", "csv"].includes(formato)) return NextResponse.json({ mensaje: "Formato inválido." }, { status: 400 });
  const compras = await prisma.compra.findMany({ where: { negocioId: contexto.negocio.id }, include: { sede: { select: { nombre: true } }, items: true }, orderBy: { creadoEn: "desc" } });
  const filas = compras.flatMap((compra) => compra.items.map((item) => [new Intl.DateTimeFormat("es-AR").format(compra.creadoEn), compra.proveedor ?? "", compra.sede.nombre, item.nombre, item.sku ?? "", String(item.cantidad), String(item.costo), String(item.subtotal)]));
  const encabezados = ["Fecha", "Proveedor", "Local", "Producto", "SKU", "Cantidad", "Costo unitario", "Subtotal"];
  const nombre = `compras-${contexto.negocio.slug}-${new Date().toISOString().slice(0, 10)}`;
  if (formato === "csv") {
    const proteger = (valor: string) => `"${/^[=+\-@]/.test(valor) ? `'${valor}` : valor.replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [encabezados, ...filas].map((fila) => fila.map(proteger).join(";")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}.csv"`, "Cache-Control": "private, no-store" } });
  }
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Compras");
  hoja.addRow(encabezados).font = { bold: true };
  filas.forEach((fila) => hoja.addRow(fila));
  hoja.columns.forEach((columna) => { columna.width = 18; });
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  return new Response(new Uint8Array(await libro.xlsx.writeBuffer()), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${nombre}.xlsx"`, "Cache-Control": "private, no-store" } });
}
