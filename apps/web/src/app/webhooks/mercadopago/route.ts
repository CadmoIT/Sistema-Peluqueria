/** Verifica y procesa webhooks de suscripciones de Mercado Pago de forma idempotente. */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { DIAS_GRACIA_SUSCRIPCION } from "@turnos/config";
import { prisma } from "@/lib/prisma";
import { validarFirmaMercadoPago } from "@/servicios/firma-mercadopago.service";

type NotificacionMercadoPago = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

type PreapprovalMercadoPago = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference?: string;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number };
};

export async function POST(solicitud: Request) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!secreto || !accessToken) {
    return NextResponse.json(
      { mensaje: "Integración no configurada." },
      { status: 503 },
    );
  }

  const contenido = (await solicitud
    .json()
    .catch(() => null)) as NotificacionMercadoPago | null;
  const url = new URL(solicitud.url);
  const dataId = String(
    url.searchParams.get("data.id") ??
      url.searchParams.get("data_id") ??
      contenido?.data?.id ??
      "",
  );

  if (
    !validarFirmaMercadoPago({
      dataId,
      requestId: solicitud.headers.get("x-request-id"),
      encabezadoFirma: solicitud.headers.get("x-signature"),
      secreto,
    })
  ) {
    return NextResponse.json({ mensaje: "Firma inválida." }, { status: 401 });
  }

  const tipo = contenido?.type ?? url.searchParams.get("type") ?? "desconocido";
  const accion = contenido?.action ?? "actualizado";
  const eventoId = String(contenido?.id ?? `${tipo}:${accion}:${dataId}`);

  try {
    await prisma.eventoExterno.create({
      data: {
        proveedor: "MERCADO_PAGO",
        eventoId,
        tipo,
        contenido: (contenido ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ recibido: true, duplicado: true });
    }
    throw error;
  }

  try {
    if (tipo === "subscription_preapproval") {
      await procesarPreapproval(dataId, eventoId, accessToken);
    } else {
      await prisma.eventoExterno.update({
        where: { proveedor_eventoId: { proveedor: "MERCADO_PAGO", eventoId } },
        data: { procesadoEn: new Date() },
      });
    }
  } catch (error) {
    await prisma.eventoExterno.deleteMany({
      where: { proveedor: "MERCADO_PAGO", eventoId, procesadoEn: null },
    });
    console.error("No se pudo procesar el webhook de Mercado Pago", error);
    return NextResponse.json(
      { mensaje: "No se pudo procesar el evento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ recibido: true });
}

async function procesarPreapproval(
  preapprovalId: string,
  eventoId: string,
  accessToken: string,
) {
  const respuesta = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!respuesta.ok) {
    throw new Error(`Mercado Pago respondió ${respuesta.status}.`);
  }

  const preapproval = (await respuesta.json()) as PreapprovalMercadoPago;
  const suscripcion = await prisma.suscripcion.findFirst({
    where: {
      OR: [
        { proveedorId: preapproval.id },
        ...(preapproval.external_reference
          ? [{ negocioId: preapproval.external_reference }]
          : []),
      ],
    },
  });
  if (!suscripcion)
    throw new Error("La suscripción no pertenece a un negocio conocido.");

  const ahora = new Date();
  const graciaHasta = new Date(
    ahora.getTime() + DIAS_GRACIA_SUSCRIPCION * 86_400_000,
  );
  const estado =
    preapproval.status === "authorized"
      ? "ACTIVA"
      : preapproval.status === "paused"
        ? "EN_GRACIA"
        : preapproval.status === "cancelled"
          ? "CANCELADA"
          : suscripcion.estado;

  await prisma.$transaction([
    prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        proveedorId: preapproval.id,
        estado,
        precioMensual:
          preapproval.auto_recurring?.transaction_amount ??
          suscripcion.precioMensual,
        proximoCobro: preapproval.next_payment_date
          ? new Date(preapproval.next_payment_date)
          : null,
        graciaHasta:
          preapproval.status === "paused"
            ? graciaHasta
            : preapproval.status === "authorized"
              ? null
              : suscripcion.graciaHasta,
      },
    }),
    prisma.eventoExterno.update({
      where: { proveedor_eventoId: { proveedor: "MERCADO_PAGO", eventoId } },
      data: { negocioId: suscripcion.negocioId, procesadoEn: ahora },
    }),
    prisma.auditoria.create({
      data: {
        negocioId: suscripcion.negocioId,
        accion: `SUSCRIPCION_${preapproval.status.toUpperCase()}`,
        recurso: "Suscripcion",
        recursoId: suscripcion.id,
        detalle: {
          proveedorId: preapproval.id,
          estadoAnterior: suscripcion.estado,
          estadoNuevo: estado,
        },
      },
    }),
  ]);
}
