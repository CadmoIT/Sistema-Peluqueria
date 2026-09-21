/** Registra compras, incorpora existencias y deja el egreso trazable en caja. */
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
import { resolverColumnasCompras } from "@/lib/columnas-compras";

type ItemCompra = {
  productoId?: unknown;
  nombre?: unknown;
  sku?: unknown;
  cantidad?: unknown;
  costo?: unknown;
  precio?: unknown;
};
type ItemCompraValidado = {
  productoId?: string;
  nombre: string;
  sku?: string;
  cantidad: number;
  costo: number;
  precio?: number;
};

function numero(valor: unknown, mensaje: string) {
  const resultado = Number(valor);
  if (!Number.isFinite(resultado)) throw new Error(mensaje);
  return resultado;
}

function leerItems(datos: FormData): ItemCompraValidado[] {
  let entrada: unknown;
  try {
    entrada = JSON.parse(leerTexto(datos, "items"));
  } catch {
    throw new Error("La compra no es válida.");
  }
  if (Array.isArray(entrada) && !entrada.length && datos.has("cantidad")) {
    entrada = [{
      productoId: leerTexto(datos, "productoId") || undefined,
      nombre: leerTexto(datos, "nombre"),
      sku: leerTexto(datos, "sku"),
      cantidad: datos.get("cantidad"),
      costo: datos.get("costo"),
      precio: datos.get("precio"),
    }];
  }
  if (!Array.isArray(entrada) || !entrada.length || entrada.length > 100)
    throw new Error("Agregá al menos un producto y no más de 100 por compra.");

  return entrada.map((valor): ItemCompraValidado => {
    const item = valor && typeof valor === "object" ? (valor as ItemCompra) : {};
    const nombre = String(item.nombre ?? "").trim();
    const cantidad = numero(item.cantidad, "La cantidad debe ser un número válido.");
    const costo = numero(item.costo, "El costo debe ser un número válido.");
    const precio = item.precio == null || item.precio === "" ? undefined : numero(item.precio, "El precio de venta no es válido.");
    const productoId = typeof item.productoId === "string" ? item.productoId.trim() : "";
    if ((!nombre && !productoId) || nombre.length > 200 || !Number.isSafeInteger(cantidad) || cantidad <= 0 || cantidad > 1_000_000 || costo <= 0 || costo > 1_000_000_000 || (precio !== undefined && (precio < 0 || precio > 1_000_000_000)))
      throw new Error("Revisá nombre, cantidad, costo y precio de los productos.");
    return { ...item, productoId, nombre: nombre || "Producto", cantidad, costo, precio, sku: String(item.sku ?? "").trim().slice(0, 100) || undefined };
  });
}

export async function registrarCompra(datos: FormData): Promise<ResultadoAccion> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol))
    return { ok: false, mensaje: "Sólo el dueño o administrador puede registrar compras." };
  try {
    const sedeId = leerTexto(datos, "sedeId");
    const proveedor = leerTexto(datos, "proveedor").slice(0, 160) || null;
    const items = leerItems(datos);
    await prisma.$transaction(async (tx) => {
      const sede = await tx.sede.findFirst({ where: { id: sedeId, negocioId: negocio.id, activa: true }, select: { id: true, nombre: true } });
      if (!sede) throw new Error("Elegí un local válido.");
      const total = items.reduce((suma, item) => suma + item.costo * item.cantidad, 0);
      const compra = await tx.compra.create({ data: { negocioId: negocio.id, sedeId: sede.id, proveedor, total: new Prisma.Decimal(total) } });
      for (const item of items) {
        const productoId = typeof item.productoId === "string" ? item.productoId : "";
        const existente = productoId
          ? await tx.producto.findFirst({ where: { id: productoId, negocioId: negocio.id } })
          : item.sku
            ? await tx.producto.findFirst({ where: { negocioId: negocio.id, sku: String(item.sku) } })
            : await tx.producto.findFirst({ where: { negocioId: negocio.id, nombre: { equals: String(item.nombre), mode: "insensitive" } } });
        const producto = existente
          ? await tx.producto.update({ where: { id: existente.id }, data: { ...(item.precio !== undefined ? { precio: new Prisma.Decimal(item.precio) } : {}), costo: new Prisma.Decimal(item.costo), ...(item.sku ? { sku: String(item.sku) } : {}) } })
          : await tx.producto.create({ data: { negocioId: negocio.id, nombre: String(item.nombre), sku: item.sku ? String(item.sku) : null, precio: new Prisma.Decimal(item.precio ?? 0), costo: new Prisma.Decimal(item.costo) } });
        const subtotal = item.costo * item.cantidad;
        await tx.compraItem.create({ data: { compraId: compra.id, productoId: producto.id, nombre: producto.nombre, sku: producto.sku, cantidad: item.cantidad, costo: new Prisma.Decimal(item.costo), subtotal: new Prisma.Decimal(subtotal) } });
        await tx.existencia.upsert({ where: { sedeId_productoId: { sedeId: sede.id, productoId: producto.id } }, create: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, cantidad: item.cantidad }, update: { cantidad: { increment: item.cantidad } } });
        await tx.movimientoStock.create({ data: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, tipo: "INGRESO", cantidad: item.cantidad, referencia: `Compra${proveedor ? ` · ${proveedor}` : ""}`.slice(0, 200) } });
      }
      await tx.movimientoCaja.create({ data: { negocioId: negocio.id, sedeId: sede.id, tipo: "EGRESO", concepto: `Compra${proveedor ? ` · ${proveedor}` : ""}`.slice(0, 200), monto: new Prisma.Decimal(total), origen: "LOCAL" } });
    });
    for (const ruta of ["compras", "caja", "inventario", "resumen", "reportes"]) revalidatePath(`/panel/${ruta}`);
    return { ok: true, mensaje: "Compra registrada. Inventario y reportes actualizados." };
  } catch (error) {
    return { ok: false, mensaje: error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : "No pudimos registrar la compra. Intentá nuevamente." };
  }
}

export async function guardarColumnasCompras(datos: FormData): Promise<ResultadoAccion> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol)) return { ok: false, mensaje: "Sólo el dueño o administrador puede editar la tabla." };
  try {
    const sedes = await prisma.sede.count({ where: { negocioId: negocio.id, activa: true } });
    const columnas = resolverColumnasCompras({ columnasCompras: datos.getAll("columnas") }, sedes > 1);
    await prisma.$executeRaw`UPDATE "Negocio" SET "configuracion" = (CASE WHEN jsonb_typeof("configuracion")='object' THEN "configuracion" ELSE '{}'::jsonb END) || ${JSON.stringify({ columnasCompras: columnas })}::jsonb, "actualizadoEn"=NOW() WHERE "id"=${negocio.id}`;
    revalidatePath("/panel/compras");
    return { ok: true, mensaje: "Tabla de compras actualizada." };
  } catch { return { ok: false, mensaje: "No pudimos guardar la tabla." }; }
}
