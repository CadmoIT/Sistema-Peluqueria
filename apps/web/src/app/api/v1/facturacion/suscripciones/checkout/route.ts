/** Inicia el checkout recurrente sin activar la suscripción desde el navegador. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PLANES } from "@turnos/config";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

type RespuestaPreapproval = {
  id?: string;
  init_point?: string;
  status?: string;
  message?: string;
};

export async function GET(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.redirect(
      new URL("/acceder?modo=ingreso", solicitud.url),
    );
  }

  const planId = new URL(solicitud.url).searchParams.get("plan");
  const plan = PLANES.find((candidato) => candidato.id === planId);
  if (!plan) {
    return NextResponse.redirect(
      new URL("/panel/facturacion?facturacion=plan-invalido", solicitud.url),
    );
  }
  const suscripcionActual = await prisma.suscripcion.findUnique({
    where: { negocioId: contexto.negocio.id },
    select: { estado: true, proveedorId: true },
  });
  if (
    suscripcionActual?.estado === "ACTIVA" ||
    suscripcionActual?.proveedorId
  ) {
    return NextResponse.redirect(
      new URL("/panel/facturacion?facturacion=plan-activo", solicitud.url),
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webUrl = process.env.WEB_URL ?? new URL(solicitud.url).origin;
  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/panel/facturacion?facturacion=no-configurada", solicitud.url),
    );
  }

  const respuesta = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      reason: `TurnosRápidos - ${plan.nombre}`,
      external_reference: contexto.negocio.id,
      payer_email: contexto.usuario.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.precioMensual,
        currency_id: "ARS",
      },
      back_url: `${webUrl.replace(/\/$/, "")}/panel/facturacion?facturacion=retorno`,
      status: "pending",
    }),
    cache: "no-store",
  });
  const resultado = (await respuesta.json()) as RespuestaPreapproval;

  if (!respuesta.ok || !resultado.id || !resultado.init_point) {
    console.error("Mercado Pago rechazó la creación de la suscripción", {
      estado: respuesta.status,
      mensaje: resultado.message,
    });
    return NextResponse.redirect(
      new URL("/panel/facturacion?facturacion=error", solicitud.url),
    );
  }

  await prisma.suscripcion.upsert({
    where: { negocioId: contexto.negocio.id },
    create: {
      negocioId: contexto.negocio.id,
      plan: plan.id,
      precioMensual: plan.precioMensual,
      proveedorId: resultado.id,
      estado: "CONFIGURACION_GRATUITA",
    },
    update: {
      plan: plan.id,
      precioMensual: plan.precioMensual,
      proveedorId: resultado.id,
    },
  });

  return NextResponse.redirect(resultado.init_point);
}
