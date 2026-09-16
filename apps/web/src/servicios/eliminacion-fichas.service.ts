/** Elimina fichas del negocio en una transacción y conserva referencias históricas neutras. */
import { Prisma, type PrismaClient } from "@prisma/client";
export type TipoFicha = "cliente" | "profesional" | "producto";
export type ResultadoAccion = { ok: boolean; mensaje: string; codigo?: string };
export async function eliminarFicha(db: PrismaClient, negocioId: string, tipo: TipoFicha, id: string): Promise<ResultadoAccion> {
  return db.$transaction(async (tx) => {
    const tabla = tipo === "cliente" ? Prisma.sql`"Cliente"` : tipo === "profesional" ? Prisma.sql`"Profesional"` : Prisma.sql`"Producto"`;
    const fichas = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM ${tabla} WHERE "id" = ${id} AND "negocioId" = ${negocioId} FOR UPDATE`);
    if (!fichas.length) return { ok: false, mensaje: "La ficha ya no está disponible." };
    if (tipo !== "producto") {
      const futuros = await tx.reserva.findMany({
        where: { negocioId, ...(tipo === "cliente" ? { clienteId: id } : { profesionalId: id }), fin: { gt: new Date() }, estado: { in: ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO", "CONFIRMADA"] } },
        select: { id: true, inicio: true }, orderBy: { inicio: "asc" }, take: 5,
      });
      if (futuros.length) {
        const negocio = await tx.negocio.findUniqueOrThrow({ where: { id: negocioId }, select: { zonaHoraria: true } });
        const fechas = futuros.map((t) => new Intl.DateTimeFormat("es-AR", { timeZone: negocio.zonaHoraria, dateStyle: "short", timeStyle: "short", hour12: false }).format(t.inicio)).join(", ");
        return { ok: false, codigo: "TURNOS_ACTIVOS", mensaje: `Tiene turnos activos (${fechas}). Cancelalos o reasignalos desde Agenda antes de eliminar esta ficha.` };
      }
    }
    if (tipo === "cliente") {
      await tx.avisoReserva.updateMany({ where: { negocioId, reserva: { clienteId: id }, estado: { in: ["PENDIENTE", "ENVIANDO", "FALLIDO"] } }, data: { estado: "OMITIDO", error: "Cliente eliminado." } });
      await tx.cliente.delete({ where: { id } });
    } else if (tipo === "profesional") {
      const profesional = await tx.profesional.findUniqueOrThrow({ where: { id }, select: { membresiaId: true } });
      if (profesional.membresiaId) await tx.membresia.updateMany({ where: { id: profesional.membresiaId, negocioId, rol: "PROFESIONAL" }, data: { activo: false } });
      // La cascada retira conexiones exclusivas locales, sin tocar calendarios remotos.
      await tx.profesional.delete({ where: { id } });
    } else {
      const existencias = await tx.existencia.findMany({ where: { negocioId, productoId: id } });
      for (const existencia of existencias) if (existencia.cantidad) await tx.movimientoStock.create({ data: { negocioId, productoId: id, sedeId: existencia.sedeId, tipo: "AJUSTE", cantidad: -existencia.cantidad, referencia: `Baja definitiva del producto:${id}` } });
      await tx.producto.delete({ where: { id } });
    }
    return { ok: true, mensaje: "Ficha eliminada definitivamente. Los movimientos históricos se conservaron." };
  });
}
