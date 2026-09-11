/** Crea productos y su existencia inicial en una única escritura anidada. */
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerNumero, leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function crearProducto(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const sedeId = leerTexto(datos, "sedeId");
  const sede = await prisma.sede.findFirst({
    where: { id: sedeId, negocioId: negocio.id, activa: true },
  });
  if (!sede) throw new Error("La sede no es válida.");

  await prisma.producto.create({
    data: {
      negocioId: negocio.id,
      nombre: leerTexto(datos, "nombre"),
      sku: textoOpcional(leerTexto(datos, "sku")),
      precio: new Prisma.Decimal(Math.max(0, leerNumero(datos, "precio"))),
      costo: new Prisma.Decimal(Math.max(0, leerNumero(datos, "costo"))),
      existencias: {
        create: {
          negocioId: negocio.id,
          sedeId: sede.id,
          cantidad: Math.max(0, leerNumero(datos, "cantidad")),
          minimo: Math.max(0, leerNumero(datos, "minimo")),
        },
      },
    },
  });

  revalidatePath("/panel/inventario");
}

export async function actualizarProducto(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const producto = await prisma.producto.findFirst({
    where: { id, negocioId: negocio.id },
  });
  if (!producto) throw new Error("El producto no existe.");

  await prisma.producto.update({
    where: { id: producto.id },
    data: {
      nombre: leerTexto(datos, "nombre"),
      sku: textoOpcional(leerTexto(datos, "sku")),
      precio: new Prisma.Decimal(Math.max(0, leerNumero(datos, "precio"))),
      costo: new Prisma.Decimal(Math.max(0, leerNumero(datos, "costo"))),
    },
  });
  revalidarInventario();
}

export async function ajustarStock(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const productoId = leerTexto(datos, "productoId");
  const sedeId = leerTexto(datos, "sedeId");
  const diferencia = Math.trunc(leerNumero(datos, "diferencia"));
  if (!diferencia) throw new Error("El ajuste no puede ser cero.");

  await prisma.$transaction(async (tx) => {
    const [producto, sede, existencia] = await Promise.all([
      tx.producto.findFirst({
        where: { id: productoId, negocioId: negocio.id },
      }),
      tx.sede.findFirst({
        where: { id: sedeId, negocioId: negocio.id, activa: true },
      }),
      tx.existencia.findUnique({
        where: { sedeId_productoId: { sedeId, productoId } },
      }),
    ]);
    if (!producto || !sede) throw new Error("Producto o sede inválidos.");
    const cantidad = (existencia?.cantidad ?? 0) + diferencia;
    if (cantidad < 0) throw new Error("El stock no puede quedar en negativo.");
    await tx.existencia.upsert({
      where: { sedeId_productoId: { sedeId, productoId } },
      create: {
        negocioId: negocio.id,
        sedeId,
        productoId,
        cantidad,
      },
      update: { cantidad },
    });
    await tx.movimientoStock.create({
      data: {
        negocioId: negocio.id,
        sedeId,
        productoId,
        tipo: "AJUSTE",
        cantidad: diferencia,
        referencia: textoOpcional(leerTexto(datos, "motivo")),
      },
    });
  });
  revalidarInventario();
}

export async function alternarProducto(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const producto = await prisma.producto.findFirst({
    where: { id, negocioId: negocio.id },
  });
  if (!producto) throw new Error("El producto no existe.");
  await prisma.producto.update({
    where: { id: producto.id },
    data: { activo: !producto.activo },
  });
  revalidarInventario();
}

function revalidarInventario() {
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/caja");
  revalidatePath("/panel");
}
