/** Activa o pausa la renovación automática de la suscripción del negocio. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import type { obtenerContextoApi } from "@/servicios/contexto-api.service";

type SolicitudRenovacion = { activa?: boolean };
type SuscripcionMercadoPago = {
  id?: string;
  status?: string;
  external_reference?: string;
  message?: string;
};

const PLANES_PAGOS = new Set(["autogestionado", "pro"]);

export async function ejecutarRenovacionMercadoPago(solicitud: Request, obtenerContexto: typeof obtenerContextoApi) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }

  const contexto = await obtenerContexto();
  if (!contexto) {
    return NextResponse.json({ mensaje: "La sesión expiró." }, { status: 401 });
  }

  let cuerpo: SolicitudRenovacion;
  try {
    cuerpo = (await solicitud.json()) as SolicitudRenovacion;
  } catch {
    return NextResponse.json({ mensaje: "Solicitud inválida." }, { status: 400 });
  }
  if (typeof cuerpo.activa !== "boolean") {
    return NextResponse.json({ mensaje: "Indicá el estado de renovación." }, { status: 400 });
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { negocioId: contexto.negocio.id },
    select: {
      id: true,
      plan: true,
      estado: true,
      proveedorId: true,
      proximoCobro: true,
      cancelarAlFinal: true,
    },
  });
  if (
    !suscripcion ||
    !suscripcion.proveedorId ||
    !PLANES_PAGOS.has(suscripcion.plan) ||
    !["ACTIVA", "EN_GRACIA"].includes(suscripcion.estado)
  ) {
    return NextResponse.json(
      { mensaje: "La renovación automática solo está disponible para planes Plus y Pro activos." },
      { status: 409 },
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ mensaje: "Facturación no está configurada." }, { status: 503 });
  }

  const url = `https://api.mercadopago.com/preapproval/${encodeURIComponent(suscripcion.proveedorId)}`;
  const actual = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).catch((error: unknown) => {
    console.error("No se pudo consultar la suscripción en Mercado Pago.", error);
    return null;
  });
  if (!actual) {
    return NextResponse.json({ mensaje: "No se pudo confirmar el estado en Mercado Pago." }, { status: 502 });
  }
  const suscripcionMP = (await actual.json().catch(() => null)) as SuscripcionMercadoPago | null;
  if (!actual.ok || !suscripcionMP?.id) {
    console.error("Mercado Pago no devolvió la suscripción esperada", { estado: actual.status });
    return NextResponse.json({ mensaje: "No pudimos consultar tu suscripción en Mercado Pago." }, { status: 502 });
  }
  if (suscripcionMP.external_reference !== contexto.negocio.id) {
    console.error("La referencia de la suscripción no coincide con el negocio.", {
      suscripcionId: suscripcion.id,
    });
    return NextResponse.json({ mensaje: "La suscripción no coincide con este negocio." }, { status: 409 });
  }

  const objetivo = cuerpo.activa ? "authorized" : "paused";
  const estadoActual = suscripcionMP.status;
  if (estadoActual === "canceled" || estadoActual === "cancelled") {
    if (!cuerpo.activa) {
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { cancelarAlFinal: true },
      });
      return NextResponse.json({ activa: false, yaEstabaPausada: true });
    }
    return NextResponse.json(
      { mensaje: "Esta suscripción fue cancelada en Mercado Pago y no se puede reactivar. Contratá nuevamente el plan al vencer el período actual." },
      { status: 409 },
    );
  }
  if (estadoActual !== "authorized" && estadoActual !== "paused") {
    return NextResponse.json(
      { mensaje: "Mercado Pago todavía no tiene una suscripción autorizada para cambiar." },
      { status: 409 },
    );
  }

  if (estadoActual !== objetivo) {
    const respuesta = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `renovacion-${objetivo}-${suscripcion.id}-${randomUUID()}`,
      },
      body: JSON.stringify({ status: objetivo }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    }).catch((error: unknown) => {
      console.error("No se pudo actualizar la renovación en Mercado Pago.", error);
      return null;
    });
    const resultado = (await respuesta?.json().catch(() => null)) as SuscripcionMercadoPago | null;
    if (!respuesta) {
      return NextResponse.json({ mensaje: "No se pudo confirmar el cambio con Mercado Pago. Revisá el estado antes de volver a intentarlo." }, { status: 502 });
    }
    if (!respuesta.ok || resultado?.status !== objetivo) {
      console.error("Mercado Pago rechazó el cambio de renovación", {
        estado: respuesta.status,
        mensaje: resultado?.message,
      });
      return NextResponse.json({ mensaje: "Mercado Pago no pudo actualizar la renovación automática." }, { status: 502 });
    }
  }

  await prisma.suscripcion.update({
    where: { id: suscripcion.id },
    data: { cancelarAlFinal: !cuerpo.activa },
  });
  return NextResponse.json({ activa: cuerpo.activa });
}
