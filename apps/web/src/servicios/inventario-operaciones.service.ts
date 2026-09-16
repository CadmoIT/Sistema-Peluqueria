/** Ajusta stock con bloqueo del producto y guarda valores libres sin sobrescribir campos ocultos. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { valorColumna } from "../lib/columnas-inventario";
export async function ajustarExistencia(db: PrismaClient, negocioId: string, productoId: string, sedeId: string, diferencia: number, motivo: string) {
  if (!Number.isSafeInteger(diferencia) || !diferencia || Math.abs(diferencia) > 1_000_000) throw new Error("Ingresá un ajuste entero entre −1.000.000 y 1.000.000, distinto de cero.");
  await db.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Producto" WHERE "id"=${productoId} AND "negocioId"=${negocioId} FOR UPDATE`;
    if (!filas.length || !await tx.sede.findFirst({ where: { id: sedeId, negocioId, activa: true } })) throw new Error("Producto o local no disponibles.");
    const existente = await tx.existencia.findUnique({ where: { sedeId_productoId: { sedeId, productoId } } });
    if ((existente?.cantidad ?? 0) + diferencia < 0) throw new Error("La cantidad no puede quedar en negativo.");
    await tx.existencia.upsert({ where: { sedeId_productoId: { sedeId, productoId } }, create: { negocioId, sedeId, productoId, cantidad: diferencia }, update: { cantidad: { increment: diferencia } } });
    await tx.movimientoStock.create({ data: { negocioId, sedeId, productoId, tipo: "AJUSTE", cantidad: diferencia, referencia: motivo.slice(0, 200) || "Ajuste de cantidad" } });
  });
}
export async function guardarValoresLibres(tx: Prisma.TransactionClient, negocioId: string, productoId: string, datos: FormData) {
  const columnas = await tx.columnaInventario.findMany({ where: { negocioId } });
  for (const columna of columnas) {
    const campo = `columna:${columna.id}`;
    if (!datos.has(campo)) continue;
    const valor = valorColumna(columna.tipo, String(datos.get(campo) ?? ""));
    if (valor === null) await tx.valorColumnaInventario.deleteMany({ where: { productoId, columnaId: columna.id } });
    else await tx.valorColumnaInventario.upsert({ where: { productoId_columnaId: { productoId, columnaId: columna.id } }, create: { productoId, columnaId: columna.id, valor }, update: { valor } });
  }
}
