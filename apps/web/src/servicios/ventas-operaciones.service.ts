/** Registra ventas atribuidas, stock y caja de manera atómica e idempotente. */
import { createHash } from "node:crypto";
import {
  descuentoNegocio,
  medioValido,
  precioMedio,
} from "@/lib/precios-medios";
import { Prisma, type PrismaClient } from "@prisma/client";
import { exigirPermisoEquipo, exigirSedeEquipo } from "@/lib/permisos-equipo";
import type { ContextoEquipo } from "./contexto-equipo.service";
import { transaccionEquipo } from "./transaccion-equipo";
import { registrarActividadEquipo } from "./actividad-equipo.service";
export type ItemVenta = {
  id: string;
  tipo: "producto" | "servicio";
  cantidad: number;
};
export function validarItems(entrada: unknown): ItemVenta[] {
  if (!Array.isArray(entrada) || !entrada.length || entrada.length > 50)
    throw new Error("Agregá entre uno y cincuenta artículos.");
  const claves = new Set<string>();
  return entrada
    .map((dato): ItemVenta => {
      if (!dato || typeof dato !== "object")
        throw new Error("Artículo inválido.");
      const { id, tipo, cantidad } = dato as Record<string, unknown>;
      if (
        typeof id !== "string" ||
        !id ||
        (tipo !== "producto" && tipo !== "servicio") ||
        typeof cantidad !== "number" ||
        !Number.isInteger(cantidad) ||
        cantidad < 1 ||
        cantidad > 100
      )
        throw new Error("Ingresá cantidades enteras entre 1 y 100.");
      const clave = `${tipo}:${id}`;
      if (claves.has(clave))
        throw new Error(
          "Un artículo está repetido. Ajustá su cantidad en el carrito.",
        );
      claves.add(clave);
      return { id, tipo, cantidad };
    })
    .sort((a, b) => `${a.tipo}:${a.id}`.localeCompare(`${b.tipo}:${b.id}`));
}
export async function resolverAtribucion(
  tx: Prisma.TransactionClient,
  negocioId: string,
  atribucion: string,
) {
  if (atribucion === "local")
    return { origen: "LOCAL" as const, profesionalId: null };
  if (atribucion) {
    const profesional = await tx.profesional.findFirst({
      where: { id: atribucion, negocioId, activo: true },
      select: { id: true },
    });
    if (!profesional)
      throw new Error("La persona seleccionada ya no está disponible.");
    return { origen: "EQUIPO" as const, profesionalId: profesional.id };
  }
  if (await tx.profesional.count({ where: { negocioId, activo: true } }))
    throw new Error(
      "Elegí a quién atribuir la compra: Local o una persona del Equipo.",
    );
  return { origen: "LOCAL" as const, profesionalId: null };
}
export async function vender(
  db: PrismaClient,
  negocioId: string,
  entrada: {
    sedeId: string;
    atribucion: string;
    idempotencia: string;
    items: unknown;
    medio?: string;
  },
  contexto?: ContextoEquipo,
) {
  if (contexto) {
    exigirPermisoEquipo(contexto, "venta");
    exigirSedeEquipo(contexto, entrada.sedeId);
    if (contexto.identidad.rol === "PROFESIONAL")
      entrada = { ...entrada, atribucion: contexto.identidad.profesionalId! };
  }
  const items = validarItems(entrada.items);
  const medio = medioValido(entrada.medio || "TARJETA_EXTERNA");
  if (!/^[a-zA-Z0-9-]{16,128}$/.test(entrada.idempotencia))
    throw new Error("Volvé a abrir el carrito para confirmar la compra.");
  const solicitudHash = createHash("sha256")
    .update(
      JSON.stringify({
        sedeId: entrada.sedeId,
        atribucion: entrada.atribucion,
        items,
        medio,
      }),
    )
    .digest("hex");
  return transaccionEquipo(
    db,
    async (tx) => {
      // El bloqueo por solicitud evita repetir una venta incluso si la respuesta anterior se perdió.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${negocioId}:${entrada.idempotencia}`}, 0))::text`;
      const anterior = await tx.venta.findUnique({
        where: {
          negocioId_idempotencia: {
            negocioId,
            idempotencia: entrada.idempotencia,
          },
        },
      });
      if (anterior) {
        if (
          anterior.solicitudHash !== solicitudHash ||
          (contexto && anterior.actorUsuarioId !== contexto.usuario.id)
        )
          throw new Error("Esta confirmación ya se usó con otro carrito.");
        return anterior;
      }
      const sede = await tx.sede.findFirst({
        where: { id: entrada.sedeId, negocioId, activa: true },
        select: { id: true },
      });
      if (!sede) throw new Error("Elegí un local válido.");
      const atribucion = await resolverAtribucion(
        tx,
        negocioId,
        entrada.atribucion,
      );
      const idsProducto = items
        .filter((i) => i.tipo === "producto")
        .map((i) => i.id)
        .sort();
      if (idsProducto.length)
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Producto" WHERE "negocioId"=${negocioId} AND "id" IN (${Prisma.join(idsProducto)}) ORDER BY "id" FOR UPDATE`,
        );
      const [productos, servicios] = await Promise.all([
        tx.producto.findMany({
          where: { negocioId, activo: true, id: { in: idsProducto } },
        }),
        tx.servicio.findMany({
          where: {
            negocioId,
            activo: true,
            id: {
              in: items.filter((i) => i.tipo === "servicio").map((i) => i.id),
            },
            OR: [
              { sedes: { none: {} } },
              { sedes: { some: { sedeId: sede.id } } },
            ],
          },
        }),
      ]);
      const configuracionActual = await tx.negocio.findUniqueOrThrow({
        where: { id: negocioId },
        select: { configuracion: true },
      });
      const descuentoAplicable = descuentoNegocio(
        configuracionActual.configuracion,
      );
      const lineas = items.map((item) => {
        const recurso =
          item.tipo === "producto"
            ? productos.find((p) => p.id === item.id)
            : servicios.find((s) => s.id === item.id);
        if (!recurso)
          throw new Error("Un artículo ya no está disponible en este local.");
        return {
          productoId: item.tipo === "producto" ? item.id : null,
          concepto: recurso.nombre,
          cantidad: item.cantidad,
          precio:
            item.tipo === "servicio"
              ? precioMedio(recurso.precio, medio, descuentoAplicable)
              : recurso.precio,
          precioBase: recurso.precio,
        };
      });
      const total = lineas.reduce(
        (s, i) => s.plus(i.precio.mul(i.cantidad)),
        new Prisma.Decimal(0),
      );
      if (contexto?.identidad.rol === "PROFESIONAL") {
        const asignados = await tx.profesionalServicio.findMany({
          where: {
            profesionalId: contexto.identidad.profesionalId!,
            servicioId: {
              in: items.filter((i) => i.tipo === "servicio").map((i) => i.id),
            },
          },
        });
        if (
          asignados.length !== items.filter((i) => i.tipo === "servicio").length
        )
          throw new Error("Un servicio no está asignado a tu cuenta.");
      }
      const venta = await tx.venta.create({
        data: {
          negocioId,
          sedeId: sede.id,
          total,
          medio,
          descuentoEfectivo: medio === "EFECTIVO" ? descuentoAplicable : 0,
          precioBase: lineas.reduce(
            (s, i) => s.plus(i.precioBase.mul(i.cantidad)),
            new Prisma.Decimal(0),
          ),
          ...atribucion,
          actorUsuarioId: contexto?.usuario.id,
          idempotencia: entrada.idempotencia,
          solicitudHash,
          items: {
            create: lineas.map((i) => ({
              productoId: i.productoId,
              concepto: i.concepto,
              cantidad: i.cantidad,
              precio: i.precio,
            })),
          },
        },
      });
      for (const item of lineas)
        if (item.productoId) {
          const descuento = await tx.existencia.updateMany({
            where: {
              negocioId,
              sedeId: sede.id,
              productoId: item.productoId,
              cantidad: { gte: item.cantidad },
            },
            data: { cantidad: { decrement: item.cantidad } },
          });
          if (!descuento.count)
            throw new Error(`No hay cantidad suficiente de ${item.concepto}.`);
          await tx.movimientoStock.create({
            data: {
              negocioId,
              sedeId: sede.id,
              productoId: item.productoId,
              tipo: "VENTA",
              cantidad: -item.cantidad,
              referencia: venta.id,
            },
          });
        }
      await tx.movimientoCaja.create({
        data: {
          negocioId,
          sedeId: sede.id,
          tipo: "INGRESO",
          concepto: `Venta ${venta.id.slice(-6).toUpperCase()}`,
          monto: total,
          ...atribucion,
          actorUsuarioId: contexto?.usuario.id,
          operacionId: venta.id,
        },
      });
      if (contexto)
        await registrarActividadEquipo(tx, contexto, {
          accion: "REGISTRAR_VENTA",
          recurso: "venta",
          recursoId: venta.id,
          sedeId: sede.id,
          profesionalId: venta.profesionalId,
          detalle: { total: total.toString() },
        });
      return tx.venta.update({
        where: { id: venta.id },
        data: { deshacerHasta: new Date(Date.now() + 15000) },
      });
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
