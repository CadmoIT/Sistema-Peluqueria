/** Valida y encola webhooks de Mercado Pago; el worker hace el trabajo lento. */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validarFirmaMercadoPago } from "@/servicios/firma-mercadopago.service";

export const runtime = "nodejs";

type NotificacionMercadoPago = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export async function POST(solicitud: Request) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) {
    return NextResponse.json(
      { mensaje: "Webhook de Mercado Pago no configurado." },
      { status: 503 },
    );
  }

  const contenido = (await solicitud
    .json()
    .catch(() => null)) as NotificacionMercadoPago | null;
  if (!contenido || typeof contenido !== "object") {
    return NextResponse.json({ mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  const url = new URL(solicitud.url);
  const dataId = String(
    url.searchParams.get("data.id") ??
      url.searchParams.get("data_id") ??
      contenido.data?.id ??
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

  const tipo = contenido.type ?? url.searchParams.get("type") ?? "desconocido";
  const accion = contenido.action ?? "actualizado";
  const eventoId = String(
    contenido.id ??
      createHash("sha256")
        .update(`${tipo}:${accion}:${dataId}`)
        .digest("hex"),
  );

  try {
    await prisma.eventoExterno.create({
      data: {
        proveedor: "MERCADO_PAGO",
        eventoId,
        tipo,
        recursoId: dataId || null,
        contenido: contenido as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ recibido: true, duplicado: true });
    }
    // Sin confirmación, Mercado Pago vuelve a enviar y no se pierde el evento.
    console.error("No se pudo guardar el webhook de Mercado Pago.", error);
    return NextResponse.json(
      { mensaje: "No se pudo registrar el evento." },
      { status: 503 },
    );
  }

  return NextResponse.json({ recibido: true }, { status: 200 });
}
