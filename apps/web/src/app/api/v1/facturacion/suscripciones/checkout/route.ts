/** Inicia el checkout recurrente sin activar la suscripción desde el navegador. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PLANES, PLAN_PRO } from "@turnos/config";
import { prisma } from "@/lib/prisma";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

type RespuestaPreapproval = {
  id?: string;
  init_point?: string;
  status?: string;
  message?: string;
};

export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.redirect(
      new URL("/acceder?modo=ingreso", solicitud.url),
      303,
    );
  }

  const planId = new URL(solicitud.url).searchParams.get("plan");
  const plan = [...PLANES, PLAN_PRO].find(
    (candidato) => candidato.id === planId,
  );
  if (!plan || plan.precioMensual === null || plan.precioMensual <= 0) {
    return NextResponse.redirect(
      new URL("/panel/planes?facturacion=plan-invalido", solicitud.url),
      303,
    );
  }
  const suscripcionActual = await prisma.suscripcion.findUnique({
    where: { negocioId: contexto.negocio.id },
    select: { id: true, plan: true, estado: true, proveedorId: true },
  });
  if (
    suscripcionActual?.plan === plan.id &&
    suscripcionActual.estado === "ACTIVA"
  ) {
    return NextResponse.redirect(
      new URL("/panel/planes?facturacion=plan-actual", solicitud.url),
      303,
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webUrl = process.env.WEB_URL ?? new URL(solicitud.url).origin;
  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/panel/planes?facturacion=no-configurada", solicitud.url),
      303,
    );
  }

  const retornoPlanes = `${webUrl.replace(/\/$/, "")}/panel/planes?facturacion=retorno`;
  if (suscripcionActual?.proveedorId) {
    const respuestaCambio = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(suscripcionActual.proveedorId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
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
        }),
        cache: "no-store",
      },
    );
    const resultadoCambio = (await respuestaCambio
      .json()
      .catch(() => null)) as RespuestaPreapproval | null;
    if (!respuestaCambio.ok) {
      console.error("Mercado Pago rechazó el cambio de plan", {
        estado: respuestaCambio.status,
        mensaje: resultadoCambio?.message,
      });
      return NextResponse.redirect(
        new URL("/panel/planes?facturacion=error", solicitud.url),
        303,
      );
    }
    await prisma.suscripcion.update({
      where: { id: suscripcionActual.id },
      data: { plan: plan.id, precioMensual: plan.precioMensual },
    });
    if (resultadoCambio?.init_point) {
      return NextResponse.redirect(resultadoCambio.init_point, 303);
    }
    return NextResponse.redirect(
      new URL("/panel/planes?facturacion=actualizado", solicitud.url),
      303,
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
      back_url: retornoPlanes,
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
      new URL("/panel/planes?facturacion=error", solicitud.url),
      303,
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

  return NextResponse.redirect(resultado.init_point, 303);
}
