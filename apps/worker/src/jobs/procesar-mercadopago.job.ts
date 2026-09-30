/** Procesa la bandeja durable de Mercado Pago, reconcilia estados y reintenta fallos. */
import type { Job } from "pg-boss";
import { Prisma } from "@prisma/client";
import { DIAS_GRACIA_SUSCRIPCION } from "@turnos/config";
import { prisma } from "../lib/prisma.js";
import { MAX_INTENTOS_ENTREGA, proximoIntento } from "../lib/reintentos.js";
import { vincularPagoSuscripcion } from "../lib/vincular-pago-suscripcion.js";

export const COLA_MERCADOPAGO = "procesar-mercadopago";
const TAMANO_LOTE = 20;
const RECLAMO_VENCIDO_MINUTOS = 10;

type EventoReclamado = {
  id: string;
  tipo: string;
  recursoId: string | null;
  contenido: Prisma.JsonValue;
  intentos: number;
};

type RecursoMP = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  preapproval_id?: string | number;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string;
  date_created?: string;
  collector_id?: string | number;
  payment?: { id?: string | number; status?: string; status_detail?: string };
};

export async function procesarEventosMercadoPago(_trabajos: Job[]) {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.warn("Worker de Mercado Pago en espera: falta el Access Token.");
    return;
  }
  // Recuperación limitada al fallo histórico corregido: no reactiva otros errores
  // ni toca eventos procesados o reclamados por otro worker.
  await prisma.eventoExterno.updateMany({
    where: {
      proveedor: "MERCADO_PAGO",
      tipo: "subscription_authorized_payment",
      estado: "FALLIDO",
      error: "El pago no está vinculado a una suscripción identificable.",
    },
    data: { estado: "RECIBIDO", intentos: 0, error: null, proximoIntentoEn: null, reclamadoEn: null },
  });
  const eventos = await prisma.$queryRaw<EventoReclamado[]>`
    WITH por_reclamar AS (
      SELECT "id"
      FROM "EventoExterno"
      WHERE "proveedor" = 'MERCADO_PAGO'
        AND (
          ("estado" = 'RECIBIDO' AND ("proximoIntentoEn" IS NULL OR "proximoIntentoEn" <= NOW()))
          OR ("estado" = 'PROCESANDO' AND ("reclamadoEn" IS NULL OR "reclamadoEn" <= NOW() - (${RECLAMO_VENCIDO_MINUTOS} * INTERVAL '1 minute')))
        )
      ORDER BY "recibidoEn" ASC
      LIMIT ${TAMANO_LOTE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "EventoExterno" AS evento
    SET "estado" = 'PROCESANDO',
        "intentos" = evento."intentos" + 1,
        "reclamadoEn" = NOW(),
        "error" = NULL
    FROM por_reclamar
    WHERE evento."id" = por_reclamar."id"
    RETURNING evento."id", evento."tipo", evento."recursoId", evento."contenido", evento."intentos"
  `;

  for (const evento of eventos) {
    try {
      const resultado = await procesarEvento(evento);
      await prisma.eventoExterno.update({
        where: { id: evento.id },
        data: {
          estado: "PROCESADO",
          negocioId: resultado.negocioId ?? undefined,
          procesadoEn: new Date(),
          reclamadoEn: null,
          proximoIntentoEn: null,
          error: resultado.mensaje ?? null,
        },
      });
    } catch (error) {
      const mensaje = (
        error instanceof Error ? error.message : "Error al procesar el evento."
      ).slice(0, 500);
      const siguiente =
        evento.intentos < MAX_INTENTOS_ENTREGA
          ? proximoIntento(evento.intentos)
          : null;
      await prisma.eventoExterno.update({
        where: { id: evento.id },
        data: {
          estado: siguiente ? "RECIBIDO" : "FALLIDO",
          proximoIntentoEn: siguiente,
          reclamadoEn: null,
          error: mensaje,
        },
      });
      console.error("Falló el procesamiento de un webhook de Mercado Pago.", {
        eventoId: evento.id,
        tipo: evento.tipo,
        recursoId: evento.recursoId,
        intento: evento.intentos,
        reintentara: Boolean(siguiente),
        error: mensaje,
      });
    }
  }

  await finalizarCancelacionesVencidas();
}

async function procesarEvento(
  evento: EventoReclamado,
): Promise<{ negocioId?: string; mensaje?: string }> {
  const id = evento.recursoId ?? extraerDataId(evento.contenido);
  if (!id) throw new Error("El evento no incluye el ID del recurso de Mercado Pago.");

  if (evento.tipo === "subscription_preapproval") {
    const preapproval = await obtenerRecurso(`/preapproval/${encodeURIComponent(id)}`);
    return procesarPreapproval(preapproval);
  }
  if (evento.tipo === "subscription_authorized_payment") {
    const factura = await obtenerRecurso(`/authorized_payments/${encodeURIComponent(id)}`);
    const paymentId = factura.payment?.id;
    if (!paymentId) {
      // Algunas notificaciones llegan antes de que el motor haya creado el pago.
      throw new Error(`La factura recurrente ${id} todavía no tiene un pago asociado.`);
    }
    const pago = await obtenerRecurso(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
    return procesarPago(vincularPagoSuscripcion(pago, factura), String(factura.id ?? id));
  }
  if (evento.tipo === "payment" || evento.tipo === "payments") {
    const pago = await obtenerRecurso(`/v1/payments/${encodeURIComponent(id)}`);
    if (!pago.preapproval_id) {
      return { mensaje: "Ignorado: el pago no pertenece a una suscripción de plataforma." };
    }
    return procesarPago(pago);
  }

  // Los tópicos fuera del flujo de suscripciones no cambian datos de facturación.
  return { mensaje: `Ignorado: tópico no gestionado (${evento.tipo}).` };
}

async function procesarPreapproval(preapproval: RecursoMP) {
  if (!preapproval.id) throw new Error("Mercado Pago devolvió una suscripción sin ID.");
  const negocioId = preapproval.external_reference;
  const suscripcion = await prisma.suscripcion.findFirst({
    where: {
      OR: [
        { proveedorId: String(preapproval.id) },
        ...(negocioId ? [{ negocioId }] : []),
      ],
    },
  });
  if (!suscripcion || suscripcion.negocioId !== negocioId) {
    throw new Error("La suscripción recibida no coincide con el negocio registrado.");
  }

  const ahora = new Date();
  const status = preapproval.status;
  const proximoCobro = preapproval.next_payment_date
    ? new Date(preapproval.next_payment_date)
    : suscripcion.proximoCobro;
  const precioProveedor = preapproval.auto_recurring?.transaction_amount;
  const cambioEsperado = suscripcion.precioPendiente;
  const monedaProveedor = preapproval.auto_recurring?.currency_id;
  if (monedaProveedor && monedaProveedor !== "ARS") {
    throw new Error(`Moneda de suscripción no permitida: ${monedaProveedor}.`);
  }
  if (
    precioProveedor !== undefined &&
    Math.abs(
      precioProveedor -
        Number(cambioEsperado ?? suscripcion.precioMensual),
    ) > 0.01
  ) {
    throw new Error("El importe de Mercado Pago no coincide con el cambio de plan solicitado.");
  }

  const data: Prisma.SuscripcionUpdateInput = {
    proximoCobro,
    proveedorId: String(preapproval.id),
  };
  if (status === "paused" || status === "cancelled" || status === "canceled") {
    // Pausar/cancelar en Mercado Pago corta los próximos débitos, no el período
    // que ya fue abonado. El acceso termina en la fecha de renovación vigente.
    data.cancelarAlFinal = true;
    if (proximoCobro && proximoCobro <= ahora) {
      data.estado = "CANCELADA";
    } else if (suscripcion.estado === "PAUSADA") {
      data.estado = proximoCobro ? "ACTIVA" : "PAUSADA";
    }
  } else if (status === "authorized") {
    data.cancelarAlFinal = false;
    if (suscripcion.estado === "PAUSADA") data.estado = "ACTIVA";
    data.graciaHasta = null;
  }
  // pending/authorized no otorgan un plan pagado: sólo un pago aprobado lo hace.
  await prisma.suscripcion.update({ where: { id: suscripcion.id }, data });
  return { negocioId: suscripcion.negocioId };
}

async function procesarPago(pagoMP: RecursoMP, facturaId?: string) {
  const pagoId = pagoMP.id === undefined ? null : String(pagoMP.id);
  const preapprovalId =
    pagoMP.preapproval_id === undefined ? null : String(pagoMP.preapproval_id);
  if (!pagoId || !preapprovalId) {
    throw new Error("El pago no está vinculado a una suscripción identificable.");
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { proveedorId: preapprovalId },
  });
  if (!suscripcion) throw new Error("El pago pertenece a una suscripción desconocida.");
  const moneda = pagoMP.currency_id ?? "";
  if (moneda !== "ARS") throw new Error(`Moneda no permitida para la suscripción: ${moneda}.`);

  const monto = Number(pagoMP.transaction_amount);
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("Importe de pago inválido.");
  const importePendiente = suscripcion.precioPendiente;
  const coincideConPlanPendiente =
    importePendiente !== null && Math.abs(monto - Number(importePendiente)) <= 0.01;
  const importeActual = Number(suscripcion.precioMensual);
  if (!coincideConPlanPendiente && Math.abs(monto - importeActual) > 0.01) {
    throw new Error("El importe cobrado no coincide con el plan vigente ni con el solicitado.");
  }

  const estado = mapearEstadoPago(pagoMP.status, pagoMP.status_detail);
  const estadoProveedor = pagoMP.status ?? "unknown";
  const fechaAprobada = pagoMP.date_approved ? new Date(pagoMP.date_approved) : null;
  const datosPago = {
    negocioId: suscripcion.negocioId,
    suscripcionId: suscripcion.id,
    proveedor: "MERCADO_PAGO",
    facturaProveedorId: facturaId ?? undefined,
    idempotencia: `MERCADO_PAGO:pago:${pagoId}`,
    estado,
    estadoProveedor,
    detalleProveedor: pagoMP.status_detail ?? null,
    plan: coincideConPlanPendiente
      ? suscripcion.planPendiente
      : suscripcion.plan,
    monto: new Prisma.Decimal(monto),
    moneda,
    pagadoEn: fechaAprobada,
  };

  await prisma.$transaction(async (tx) => {
    await tx.pago.upsert({
      where: { proveedorId: pagoId },
      create: { ...datosPago, proveedorId: pagoId },
      update: datosPago,
    });

    if (estado === "APROBADO") {
      await tx.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          ...(coincideConPlanPendiente && suscripcion.planPendiente
            ? { plan: suscripcion.planPendiente }
            : {}),
          ...(coincideConPlanPendiente && importePendiente !== null
            ? { precioMensual: importePendiente }
            : {}),
          estado: "ACTIVA",
          graciaHasta: null,
          ...(coincideConPlanPendiente
            ? { planPendiente: null, precioPendiente: null, checkoutIdempotencia: null }
            : {}),
        },
      });
    } else if (estado === "CONTRACARGO") {
      await tx.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: "PAUSADA" },
      });
    } else if (estado === "REEMBOLSADO") {
      await tx.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: "PAUSADA", graciaHasta: null },
      });
    } else if (estado === "RECHAZADO") {
      if (suscripcion.estado === "ACTIVA") {
        await tx.suscripcion.update({
          where: { id: suscripcion.id },
          data: {
            estado: "EN_GRACIA",
            graciaHasta: new Date(Date.now() + DIAS_GRACIA_SUSCRIPCION * 86_400_000),
          },
        });
      }
    }

    await tx.auditoria.create({
      data: {
        negocioId: suscripcion.negocioId,
        accion: `PAGO_SUSCRIPCION_${estado}`,
        recurso: "Pago",
        recursoId: pagoId,
        detalle: {
          suscripcionId: suscripcion.id,
          proveedorId: pagoId,
          facturaProveedorId: facturaId ?? null,
          monto,
          moneda,
          estadoProveedor,
        },
      },
    });
  });

  return { negocioId: suscripcion.negocioId };
}

export function mapearEstadoPago(status?: string, detalle?: string):
  | "PENDIENTE"
  | "EN_PROCESO"
  | "APROBADO"
  | "RECHAZADO"
  | "REEMBOLSADO"
  | "REEMBOLSADO_PARCIAL"
  | "CONTRACARGO"
  | "ANULADO" {
  switch (status) {
    case "approved":
      return "APROBADO";
    case "rejected":
      return "RECHAZADO";
    case "refunded":
      return detalle === "partially_refunded"
        ? "REEMBOLSADO_PARCIAL"
        : "REEMBOLSADO";
    case "charged_back":
      return "CONTRACARGO";
    case "cancelled":
      return "ANULADO";
    case "in_process":
    case "authorized":
      return "EN_PROCESO";
    case "pending":
      return "PENDIENTE";
    default:
      throw new Error(`Estado de pago de Mercado Pago no reconocido: ${status ?? "vacío"}.`);
  }
}

async function obtenerRecurso(path: string): Promise<RecursoMP> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en el worker.");
  const respuesta = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) {
    throw new Error(`Mercado Pago respondió ${respuesta.status} al consultar ${path}.`);
  }
  return (await respuesta.json()) as RecursoMP;
}

function extraerDataId(contenido: Prisma.JsonValue): string | null {
  if (!contenido || typeof contenido !== "object" || Array.isArray(contenido)) return null;
  const data = contenido.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const id = data.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

async function finalizarCancelacionesVencidas() {
  await prisma.suscripcion.updateMany({
    where: {
      cancelarAlFinal: true,
      estado: "ACTIVA",
      proximoCobro: { lte: new Date() },
    },
    data: { estado: "CANCELADA", planPendiente: null, precioPendiente: null },
  });
}
