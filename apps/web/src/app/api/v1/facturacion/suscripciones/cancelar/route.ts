/** Cancela en Mercado Pago la suscripción autenticada del negocio. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";

export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.json({ mensaje: "La sesión expiró." }, { status: 401 });
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { negocioId: contexto.negocio.id },
    select: { id: true, proveedorId: true, estado: true },
  });
  if (!suscripcion?.proveedorId || suscripcion.estado === "CANCELADA") {
    return NextResponse.json(
      { mensaje: "No hay un plan activo para cancelar." },
      { status: 409 },
    );
  }
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { mensaje: "Facturación no está configurada." },
      { status: 503 },
    );
  }

  const respuesta = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(suscripcion.proveedorId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
      cache: "no-store",
    },
  );
  if (!respuesta.ok) {
    console.error("Mercado Pago rechazó la cancelación", {
      estado: respuesta.status,
    });
    return NextResponse.json(
      { mensaje: "Mercado Pago no pudo cancelar el plan." },
      { status: 502 },
    );
  }

  await prisma.suscripcion.update({
    where: { id: suscripcion.id },
    data: { estado: "CANCELADA", cancelarAlFinal: true },
  });
  return NextResponse.json({ cancelada: true });
}
