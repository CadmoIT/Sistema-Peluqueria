/** Operaciones compartidas atómicas con saldo, stock, autoría e idempotencia. */
import { createHash, randomUUID } from "node:crypto";
import { validarDeshacerVenta } from "@/lib/deshacer-venta";
import {
  descuentoNegocio,
  medioValido,
  acuerdoCobro,
} from "@/lib/precios-medios";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  exigirPermisoEquipo,
  exigirProfesionalEquipo,
  exigirSedeEquipo,
} from "@/lib/permisos-equipo";
import type { ContextoEquipo } from "./contexto-equipo.service";
import { transaccionEquipo } from "./transaccion-equipo";
import { registrarActividadEquipo } from "./actividad-equipo.service";
export function importeEquipo(valor: unknown) {
  const texto = String(valor);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(texto))
    throw new Error("Ingresá un importe válido con hasta dos decimales.");
  const n = new Prisma.Decimal(texto);
  if (n.lte(0) || n.gt(1_000_000_000))
    throw new Error("El importe debe ser mayor a cero.");
  return n;
}
function huella(datos: unknown) {
  return createHash("sha256").update(JSON.stringify(datos)).digest("hex");
}
async function bloquear(
  tx: Prisma.TransactionClient,
  negocioId: string,
  clave: string,
) {
  if (!/^[\w-]{16,128}$/.test(clave))
    throw new Error("Volvé a abrir el formulario para registrar la operación.");
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${negocioId}:${clave}`}, 0))::text`;
}
async function sedeValida(
  tx: Prisma.TransactionClient,
  c: ContextoEquipo,
  sedeId: string,
) {
  exigirSedeEquipo(c, sedeId);
  if (
    !(await tx.sede.findFirst({
      where: { id: sedeId, negocioId: c.negocio.id, activa: true },
    }))
  )
    throw new Error("El local no está disponible.");
}
export async function registrarConsumoEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  entrada: {
    sedeId: string;
    productoId: string;
    cantidad: number;
    motivo: string;
    idempotencia: string;
  },
) {
  exigirPermisoEquipo(c, "consumo");
  if (
    !Number.isSafeInteger(entrada.cantidad) ||
    entrada.cantidad <= 0 ||
    entrada.cantidad > 1_000_000 ||
    !entrada.motivo.trim() ||
    entrada.motivo.length > 200
  )
    throw new Error(
      "Ingresá una cantidad entera y un motivo de hasta 200 caracteres.",
    );
  return transaccionEquipo(db, async (tx) => {
    await bloquear(tx, c.negocio.id, entrada.idempotencia);
    await sedeValida(tx, c, entrada.sedeId);
    const referencia = `consumo:${entrada.idempotencia}`,
      hash = huella(entrada);
    const anterior = await tx.auditoria.findFirst({
      where: { negocioId: c.negocio.id, recursoId: referencia },
    });
    if (anterior) {
      if (
        (anterior.detalle as { hash?: string })?.hash !== hash ||
        anterior.usuarioId !== c.usuario.id
      )
        throw new Error("La operación ya se usó con otros datos.");
      return;
    }
    const p = await tx.producto.findFirst({
      where: { id: entrada.productoId, negocioId: c.negocio.id, activo: true },
    });
    if (!p) throw new Error("El producto no está disponible.");
    const cambio = await tx.existencia.updateMany({
      where: {
        negocioId: c.negocio.id,
        sedeId: entrada.sedeId,
        productoId: p.id,
        cantidad: { gte: entrada.cantidad },
      },
      data: { cantidad: { decrement: entrada.cantidad } },
    });
    if (!cambio.count)
      throw new Error("No hay stock suficiente para ese consumo.");
    await tx.movimientoStock.create({
      data: {
        negocioId: c.negocio.id,
        sedeId: entrada.sedeId,
        productoId: p.id,
        tipo: "CONSUMO",
        cantidad: -entrada.cantidad,
        referencia,
      },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "CONSUMO_STOCK",
      recurso: "stock",
      recursoId: referencia,
      sedeId: entrada.sedeId,
      compartida: true,
      detalle: {
        producto: p.nombre,
        cantidad: entrada.cantidad,
        motivo: entrada.motivo,
        hash,
      },
    });
  });
}
export type CompraEquipoEntrada = {
  sedeId: string;
  proveedor: string;
  idempotencia: string;
  items: Array<{ productoId: string; cantidad: number; costo: string }>;
};
export async function comprarEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  e: CompraEquipoEntrada,
) {
  exigirPermisoEquipo(c, "compra");
  if (
    !Array.isArray(e.items) ||
    !e.items.length ||
    e.items.length > 100 ||
    e.items.some(
      (i) =>
        !i ||
        typeof i !== "object" ||
        typeof i.productoId !== "string" ||
        typeof i.costo !== "string",
    ) ||
    new Set(e.items.map((i) => i.productoId)).size !== e.items.length
  )
    throw new Error("Agregá productos existentes sin repetirlos.");
  const items = e.items.map((i) => {
    if (
      !i.productoId ||
      !Number.isSafeInteger(i.cantidad) ||
      i.cantidad <= 0 ||
      i.cantidad > 1_000_000
    )
      throw new Error("Revisá las cantidades.");
    return { ...i, costo: importeEquipo(i.costo) };
  });
  const hash = huella(e);
  return transaccionEquipo(db, async (tx) => {
    await bloquear(tx, c.negocio.id, e.idempotencia);
    await sedeValida(tx, c, e.sedeId);
    const previa = await tx.compra.findUnique({
      where: {
        negocioId_idempotencia: {
          negocioId: c.negocio.id,
          idempotencia: e.idempotencia,
        },
      },
    });
    if (previa) {
      if (
        previa.solicitudHash !== hash ||
        previa.actorUsuarioId !== c.usuario.id
      )
        throw new Error("La compra ya se confirmó con otros datos.");
      return previa;
    }
    const total = items.reduce(
      (s, i) => s.plus(i.costo.mul(i.cantidad)),
      new Prisma.Decimal(0),
    );
    const compra = await tx.compra.create({
      data: {
        negocioId: c.negocio.id,
        sedeId: e.sedeId,
        proveedor: e.proveedor.slice(0, 160),
        total,
        actorUsuarioId: c.usuario.id,
        idempotencia: e.idempotencia,
        solicitudHash: hash,
      },
    });
    for (const i of [...items].sort((a, b) =>
      a.productoId.localeCompare(b.productoId),
    )) {
      const p = await tx.producto.findFirst({
        where: { id: i.productoId, negocioId: c.negocio.id, activo: true },
      });
      if (!p) throw new Error("Un producto ya no está disponible.");
      await tx.compraItem.create({
        data: {
          compraId: compra.id,
          productoId: p.id,
          nombre: p.nombre,
          sku: p.sku,
          cantidad: i.cantidad,
          costo: i.costo,
          subtotal: i.costo.mul(i.cantidad),
        },
      });
      await tx.existencia.upsert({
        where: { sedeId_productoId: { sedeId: e.sedeId, productoId: p.id } },
        create: {
          negocioId: c.negocio.id,
          sedeId: e.sedeId,
          productoId: p.id,
          cantidad: i.cantidad,
        },
        update: { cantidad: { increment: i.cantidad } },
      });
      await tx.movimientoStock.create({
        data: {
          negocioId: c.negocio.id,
          sedeId: e.sedeId,
          productoId: p.id,
          tipo: "INGRESO",
          cantidad: i.cantidad,
          referencia: compra.id,
        },
      });
    }
    await tx.movimientoCaja.create({
      data: {
        negocioId: c.negocio.id,
        sedeId: e.sedeId,
        tipo: "EGRESO",
        origen: "LOCAL",
        monto: total,
        concepto: `Compra ${compra.id.slice(-6)}`,
        actorUsuarioId: c.usuario.id,
        operacionId: compra.id,
      },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "REGISTRAR_COMPRA",
      recurso: "compra",
      recursoId: compra.id,
      sedeId: e.sedeId,
      compartida: true,
      detalle: {
        proveedor: e.proveedor.slice(0, 160),
        total: total.toString(),
        productos: items.length,
      },
    });
    return compra;
  });
}
export async function cobrarTurnoEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  e: { reservaId: string; monto: string; medio: string; idempotencia: string },
) {
  exigirPermisoEquipo(c, "venta");
  const monto = importeEquipo(e.monto);
  medioValido(e.medio);
  const hash = huella(e);
  return transaccionEquipo(db, async (tx) => {
    await bloquear(tx, c.negocio.id, e.idempotencia);
    const previo = await tx.cobroReserva.findUnique({
      where: {
        negocioId_idempotencia: {
          negocioId: c.negocio.id,
          idempotencia: e.idempotencia,
        },
      },
    });
    if (previo) {
      if (
        previo.solicitudHash !== hash ||
        previo.actorUsuarioId !== c.usuario.id
      )
        throw new Error("La confirmación ya se usó.");
      return previo;
    }
    await tx.$queryRaw`SELECT "id" FROM "Reserva" WHERE "id"=${e.reservaId} AND "negocioId"=${c.negocio.id} FOR UPDATE`;
    const r = await tx.reserva.findFirst({
      where: { id: e.reservaId, negocioId: c.negocio.id },
      include: {
        pagos: { where: { estado: "APROBADO" } },
        cobros: { where: { anuladoEn: null } },
      },
    });
    if (!r || !["CONFIRMADA", "COMPLETADA", "AUSENTE"].includes(r.estado))
      throw new Error("El turno no está disponible para cobrar.");
    exigirSedeEquipo(c, r.sedeId);
    exigirProfesionalEquipo(c, r.profesionalId);
    const primerCobro = [...r.cobros].sort(
      (a, b) => a.creadoEn.getTime() - b.creadoEn.getTime(),
    )[0];
    if (
      primerCobro &&
      (primerCobro.medio === "EFECTIVO") !== (e.medio === "EFECTIVO")
    )
      throw new Error(
        "Este turno ya tiene cobros con otro precio. El dueño debe corregirlos antes de cambiar el medio.",
      );
    const configuracion = await tx.negocio.findUniqueOrThrow({
      where: { id: c.negocio.id },
      select: { configuracion: true },
    });
    const { base, total, descuento } = acuerdoCobro(
      r.total,
      e.medio,
      descuentoNegocio(configuracion.configuracion),
      primerCobro,
    );
    const abonado = [...r.pagos, ...r.cobros].reduce(
      (s, p) => s.plus(p.monto),
      new Prisma.Decimal(0),
    );
    if (monto.gt(total.minus(abonado)))
      throw new Error("El importe supera el saldo pendiente del turno.");
    const id = randomUUID();
    const movimiento = await tx.movimientoCaja.create({
      data: {
        negocioId: c.negocio.id,
        sedeId: r.sedeId,
        tipo: "INGRESO",
        origen: r.profesionalId ? "EQUIPO" : "LOCAL",
        profesionalId: r.profesionalId,
        monto,
        concepto: `Cobro de turno ${r.codigo}`,
        actorUsuarioId: c.usuario.id,
        operacionId: id,
      },
    });
    const cobro = await tx.cobroReserva.create({
      data: {
        id,
        negocioId: c.negocio.id,
        sedeId: r.sedeId,
        profesionalId: r.profesionalId,
        reservaId: r.id,
        actorUsuarioId: c.usuario.id,
        monto,
        medio: e.medio,
        precioBase: base,
        totalAcordado: total,
        descuentoEfectivo: descuento,
        idempotencia: e.idempotencia,
        solicitudHash: hash,
        movimientoId: movimiento.id,
      },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "COBRAR_TURNO",
      recurso: "cobro",
      recursoId: id,
      sedeId: r.sedeId,
      profesionalId: r.profesionalId,
      detalle: { monto: monto.toString(), medio: e.medio, turno: r.codigo },
    });
    return cobro;
  });
}
export async function anularOperacionEquipo(
  db: PrismaClient,
  c: ContextoEquipo,
  tipo: string,
  id: string,
  motivo: string,
  deshacer = false,
) {
  exigirPermisoEquipo(c, deshacer ? "venta" : "dueno");
  if (deshacer && tipo !== "venta")
    throw new Error("Sólo se puede deshacer una venta rápida.");
  if (
    !motivo.trim() ||
    motivo.length > 200 ||
    !["venta", "compra", "cobro", "stock", "movimiento"].includes(tipo)
  )
    throw new Error(
      "Indicá una operación y un motivo de hasta 200 caracteres.",
    );
  return transaccionEquipo(db, async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`anular:${c.negocio.id}:${id}`},0))::text`;
    const marca = `anular:${tipo}:${id}`;
    if (deshacer) {
      const venta = await tx.venta.findFirst({
        where: { id, negocioId: c.negocio.id, actorUsuarioId: c.usuario.id },
      });
      if (!validarDeshacerVenta(venta, c.usuario.id)) return;
      if (!venta) throw new Error("No se encontró la venta.");
      exigirSedeEquipo(c, venta.sedeId);
    }
    if (
      await tx.auditoria.findFirst({
        where: { negocioId: c.negocio.id, recursoId: marca },
      })
    )
      return;
    let sedeId: string,
      profesionalId: string | null = null;
    if (tipo === "stock") {
      const m = await tx.movimientoStock.findFirst({
        where: { negocioId: c.negocio.id, referencia: id, tipo: "CONSUMO" },
      });
      if (!m?.productoId) throw new Error("No se encontró el consumo.");
      sedeId = m.sedeId;
      await tx.existencia.update({
        where: { sedeId_productoId: { sedeId, productoId: m.productoId } },
        data: { cantidad: { increment: -m.cantidad } },
      });
      await tx.movimientoStock.create({
        data: {
          negocioId: c.negocio.id,
          sedeId,
          productoId: m.productoId,
          tipo: "DEVOLUCION",
          cantidad: -m.cantidad,
          referencia: marca,
        },
      });
    } else {
      let movimiento;
      if (tipo === "cobro") {
        const r = await tx.cobroReserva.findFirst({
          where: { id, negocioId: c.negocio.id },
        });
        if (!r) throw new Error("No se encontró el cobro.");
        await tx.$queryRaw`SELECT "id" FROM "Reserva" WHERE "id"=${r.reservaId} FOR UPDATE`;
        await tx.cobroReserva.update({
          where: { id },
          data: { anuladoEn: new Date() },
        });
        movimiento = await tx.movimientoCaja.findUnique({
          where: { id: r.movimientoId },
        });
      } else if (tipo === "movimiento") {
        movimiento = await tx.movimientoCaja.findFirst({
          where: {
            id,
            negocioId: c.negocio.id,
            operacionId: null,
            reversaDeId: null,
            actorUsuarioId: { not: null },
          },
        });
      } else {
        const registro =
          tipo === "venta"
            ? await tx.venta.findFirst({
                where: { id, negocioId: c.negocio.id },
                include: { items: true },
              })
            : await tx.compra.findFirst({
                where: { id, negocioId: c.negocio.id },
                include: { items: true },
              });
        if (!registro?.actorUsuarioId)
          throw new Error(
            "Sólo se pueden anular operaciones trazables de esta versión.",
          );
        for (const i of registro.items)
          if (i.productoId) {
            const diferencia = tipo === "venta" ? i.cantidad : -i.cantidad;
            const cambio = await tx.existencia.updateMany({
              where: {
                negocioId: c.negocio.id,
                sedeId: registro.sedeId,
                productoId: i.productoId,
                ...(diferencia < 0 ? { cantidad: { gte: -diferencia } } : {}),
              },
              data: { cantidad: { increment: diferencia } },
            });
            if (!cambio.count)
              throw new Error(
                "No hay stock disponible para revertir esta operación.",
              );
            await tx.movimientoStock.create({
              data: {
                negocioId: c.negocio.id,
                sedeId: registro.sedeId,
                productoId: i.productoId,
                tipo: "AJUSTE",
                cantidad: diferencia,
                referencia: marca,
              },
            });
          }
        if (tipo === "venta")
          await tx.venta.update({
            where: { id },
            data: { anuladoEn: new Date() },
          });
        else
          await tx.compra.update({
            where: { id },
            data: { anuladoEn: new Date() },
          });
        movimiento = await tx.movimientoCaja.findFirst({
          where: { negocioId: c.negocio.id, operacionId: id },
        });
      }
      if (!movimiento)
        throw new Error("No se encontró el movimiento asociado.");
      sedeId = movimiento.sedeId;
      profesionalId = movimiento.profesionalId;
      await tx.movimientoCaja.create({
        data: {
          negocioId: c.negocio.id,
          sedeId,
          profesionalId,
          origen: movimiento.origen,
          monto: movimiento.monto,
          tipo: movimiento.tipo === "INGRESO" ? "EGRESO" : "INGRESO",
          concepto: `Anulación: ${motivo}`,
          reversaDeId: movimiento.id,
          operacionId: marca,
          actorUsuarioId: c.usuario.id,
        },
      });
    }
    await registrarActividadEquipo(tx, c, {
      accion: "ANULAR_OPERACION",
      recurso: tipo,
      recursoId: marca,
      sedeId,
      profesionalId,
      compartida: tipo === "stock" || tipo === "compra",
      detalle: { motivo, original: id },
    });
  });
}
