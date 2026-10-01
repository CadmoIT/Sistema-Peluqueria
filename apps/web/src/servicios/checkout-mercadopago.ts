/** Inicia el checkout recurrente y guarda el cambio como pendiente hasta su confirmación. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PLANES, PLAN_PRO } from "@turnos/config";
import { prisma } from "@/lib/prisma";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import type { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { obtenerCorreoCompradorMercadoPago } from "@/servicios/comprador-mercadopago";

type RespuestaPreapproval = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  status?: string;
  message?: string;
};

export async function ejecutarCheckoutMercadoPago(solicitud: Request, obtenerContexto: typeof obtenerContextoApi) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  const contexto = await obtenerContexto();
  if (!contexto) {
    return NextResponse.redirect(
      new URL("/acceder?modo=ingreso", solicitud.url),
      303,
    );
  }
  if (!["DUENO", "ADMINISTRADOR"].includes(contexto.membresia.rol)) {
    return NextResponse.json(
      { mensaje: "Solo una persona administradora puede cambiar el plan." },
      { status: 403 },
    );
  }

  const planId = new URL(solicitud.url).searchParams.get("plan");
  const plan = [...PLANES, PLAN_PRO].find((candidato) => candidato.id === planId);
  if (!plan || plan.precioMensual === null || plan.precioMensual <= 0) {
    return volver(solicitud, "plan-invalido");
  }

  const suscripcionActual = await prisma.suscripcion.findUnique({
    where: { negocioId: contexto.negocio.id },
  });
  if (!suscripcionActual) {
    return NextResponse.json(
      { mensaje: "No se encontró la suscripción del negocio." },
      { status: 409 },
    );
  }
  if (
    suscripcionActual.plan === plan.id &&
    suscripcionActual.estado === "ACTIVA" &&
    !suscripcionActual.cancelarAlFinal
  ) {
    return volver(solicitud, "plan-actual");
  }
  if (suscripcionActual.cancelarAlFinal) {
    return volver(solicitud, "cancelacion-en-curso");
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webUrl = process.env.WEB_URL ?? new URL(solicitud.url).origin;
  if (!accessToken) return volver(solicitud, "no-configurada");
  let correoComprador: string;
  try {
    correoComprador = obtenerCorreoCompradorMercadoPago(
      contexto.usuario.email,
      process.env.MERCADOPAGO_TEST_PAYER_EMAIL,
    );
  } catch {
    console.error("Configuración inválida de MERCADOPAGO_TEST_PAYER_EMAIL");
    return volver(solicitud, "error");
  }

  const retornoPlanes = `${webUrl.replace(/\/$/, "")}/panel/planes?facturacion=retorno`;
  const webhookMercadoPago = `${webUrl.replace(/\/$/, "")}/webhooks/mercadopago`;
  const mismoCambioPendiente =
    suscripcionActual.planPendiente === plan.id &&
    Number(suscripcionActual.precioPendiente) === plan.precioMensual;
  const claveIdempotencia = mismoCambioPendiente
    ? (suscripcionActual.checkoutIdempotencia ?? randomUUID())
    : randomUUID();

  // Persistimos intención y clave antes de llamar a MP: un timeout/reintento no
  // crea un segundo checkout y nunca activa el plan anticipadamente.
  await prisma.suscripcion.update({
    where: { id: suscripcionActual.id },
    data: {
      planPendiente: plan.id,
      precioPendiente: plan.precioMensual,
      checkoutIdempotencia: claveIdempotencia,
    },
  });

  if (
    suscripcionActual.proveedorId &&
    suscripcionActual.estado !== "CANCELADA" &&
    !suscripcionActual.cancelarAlFinal
  ) {
    const respuestaCambio = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(suscripcionActual.proveedorId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": claveIdempotencia,
        },
        body: JSON.stringify({
          reason: `TurnosRápidos - ${plan.nombre}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: plan.precioMensual,
            currency_id: "ARS",
          },
          back_url: retornoPlanes,
          notification_url: webhookMercadoPago,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    ).catch((error: unknown) => {
      console.error("No se pudo conectar con Mercado Pago para cambiar el plan", error);
      return null;
    });
    if (!respuestaCambio) return volver(solicitud, "error");
    const resultadoCambio = (await respuestaCambio
      .json()
      .catch(() => null)) as RespuestaPreapproval | null;
    if (!respuestaCambio.ok) {
      console.error("Mercado Pago rechazó el cambio de plan", {
        estado: respuestaCambio.status,
        mensaje: resultadoCambio?.message,
      });
      return volver(solicitud, "error");
    }
    return NextResponse.redirect(
      resultadoCambio?.init_point ?? retornoPlanes,
      303,
    );
  }

  const respuesta = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": claveIdempotencia,
    },
    body: JSON.stringify({
      reason: `TurnosRápidos - ${plan.nombre}`,
      external_reference: contexto.negocio.id,
      payer_email: correoComprador,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.precioMensual,
        currency_id: "ARS",
      },
      back_url: retornoPlanes,
      notification_url: webhookMercadoPago,
      status: "pending",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).catch((error: unknown) => {
    console.error("No se pudo conectar con Mercado Pago", error);
    return null;
  });

  if (!respuesta) return volver(solicitud, "error");
  const resultado = (await respuesta.json().catch(() => null)) as
    | RespuestaPreapproval
    | null;
  const checkoutUrl =
    process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-")
      ? resultado?.sandbox_init_point ?? resultado?.init_point
      : resultado?.init_point;
  if (!respuesta.ok || !resultado?.id || !checkoutUrl) {
    console.error("Mercado Pago rechazó la creación de la suscripción", {
      estado: respuesta.status,
      mensaje: resultado?.message,
    });
    return volver(solicitud, "error");
  }

  await prisma.suscripcion.update({
    where: { id: suscripcionActual.id },
    data: { proveedorId: resultado.id },
  });
  return NextResponse.redirect(checkoutUrl, 303);
}

function volver(solicitud: Request, estado: string) {
  return NextResponse.redirect(
    new URL(`/panel/planes?facturacion=${estado}`, solicitud.url),
    303,
  );
}
