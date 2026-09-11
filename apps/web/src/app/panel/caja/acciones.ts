/** Registra movimientos manuales de caja para el negocio y la sede actuales. */
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerNumero, leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function registrarMovimientoCaja(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const sedeId = leerTexto(datos, "sedeId");
  const tipo = leerTexto(datos, "tipo") === "EGRESO" ? "EGRESO" : "INGRESO";

  await prisma.movimientoCaja.create({
    data: {
      negocioId: negocio.id,
      sedeId,
      tipo,
      concepto: leerTexto(datos, "concepto"),
      monto: new Prisma.Decimal(Math.max(0, leerNumero(datos, "monto"))),
    },
  });

  revalidatePath("/panel/caja");
  revalidatePath("/panel/reportes");
  revalidatePath("/panel");
}

type ItemVentaEntrada = {
  id: string;
  tipo: "producto" | "servicio";
  cantidad: number;
};

export async function registrarVenta(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const sedeId = leerTexto(datos, "sedeId");
  const items = leerItemsVenta(leerTexto(datos, "items"));
  if (!items.length) throw new Error("Agregá al menos un producto o servicio.");

  await prisma.$transaction(
    async (tx) => {
      const [sede, productos, servicios] = await Promise.all([
        tx.sede.findFirst({
          where: { id: sedeId, negocioId: negocio.id, activa: true },
        }),
        tx.producto.findMany({
          where: {
            negocioId: negocio.id,
            activo: true,
            id: {
              in: items
                .filter((item) => item.tipo === "producto")
                .map((item) => item.id),
            },
          },
        }),
        tx.servicio.findMany({
          where: {
            negocioId: negocio.id,
            activo: true,
            id: {
              in: items
                .filter((item) => item.tipo === "servicio")
                .map((item) => item.id),
            },
          },
        }),
      ]);
      if (!sede) throw new Error("La sede no es válida.");

      const productosPorId = new Map(
        productos.map((producto) => [producto.id, producto]),
      );
      const serviciosPorId = new Map(
        servicios.map((servicio) => [servicio.id, servicio]),
      );
      const lineas = items.map((item) => {
        const recurso =
          item.tipo === "producto"
            ? productosPorId.get(item.id)
            : serviciosPorId.get(item.id);
        if (!recurso)
          throw new Error("Uno de los artículos ya no está disponible.");
        return {
          ...item,
          nombre: recurso.nombre,
          precio: recurso.precio,
          productoId: item.tipo === "producto" ? item.id : null,
        };
      });
      const total = lineas.reduce(
        (acumulado, item) => acumulado.plus(item.precio.mul(item.cantidad)),
        new Prisma.Decimal(0),
      );

      const venta = await tx.venta.create({
        data: {
          negocioId: negocio.id,
          sedeId: sede.id,
          total,
          items: {
            create: lineas.map((item) => ({
              productoId: item.productoId,
              concepto: item.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
            })),
          },
        },
      });

      for (const item of lineas.filter((linea) => linea.productoId)) {
        const descuento = await tx.existencia.updateMany({
          where: {
            negocioId: negocio.id,
            sedeId: sede.id,
            productoId: item.productoId!,
            cantidad: { gte: item.cantidad },
          },
          data: { cantidad: { decrement: item.cantidad } },
        });
        if (!descuento.count) {
          throw new Error(`No hay stock suficiente de ${item.nombre}.`);
        }
        await tx.movimientoStock.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            productoId: item.productoId!,
            tipo: "VENTA",
            cantidad: -item.cantidad,
            referencia: venta.id,
          },
        });
      }

      await tx.movimientoCaja.create({
        data: {
          negocioId: negocio.id,
          sedeId: sede.id,
          tipo: "INGRESO",
          concepto: `Venta ${venta.id.slice(-6).toUpperCase()}`,
          monto: total,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePath("/panel/caja");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/reportes");
  revalidatePath("/panel");
}

function leerItemsVenta(valor: string): ItemVentaEntrada[] {
  try {
    const entrada = JSON.parse(valor) as unknown;
    if (!Array.isArray(entrada)) return [];
    return entrada.slice(0, 50).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidato = item as Record<string, unknown>;
      const cantidad = Math.floor(Number(candidato.cantidad));
      if (
        typeof candidato.id !== "string" ||
        !["producto", "servicio"].includes(String(candidato.tipo)) ||
        !Number.isFinite(cantidad) ||
        cantidad < 1 ||
        cantidad > 100
      ) {
        return [];
      }
      return [
        {
          id: candidato.id,
          tipo: candidato.tipo as "producto" | "servicio",
          cantidad,
        },
      ];
    });
  } catch {
    return [];
  }
}
