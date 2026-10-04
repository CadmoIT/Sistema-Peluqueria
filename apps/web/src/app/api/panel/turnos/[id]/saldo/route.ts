/** Lee saldo de un turno sin permitir consultar reservas de compañeros u otros negocios. */
import { Prisma } from "@prisma/client";
import { descuentoNegocio } from "@/lib/precios-medios";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const c = await obtenerContextoApi();
  if (!c)
    return NextResponse.json(
      { mensaje: "Acceso no disponible." },
      { status: 403 },
    );
  const { id } = await params;
  const r = await prisma.reserva.findFirst({
    where: {
      id,
      negocioId: c.negocio.id,
      ...(c.identidad.rol === "PROFESIONAL"
        ? {
            profesionalId: c.identidad.profesionalId,
            sedeId: { in: c.identidad.sedeIds },
          }
        : {}),
    },
    include: {
      pagos: { where: { estado: "APROBADO" } },
      cobros: { where: { anuladoEn: null } },
    },
  });
  if (!r)
    return NextResponse.json(
      { mensaje: "Turno no disponible." },
      { status: 404 },
    );
  const abonado = [...r.pagos, ...r.cobros].reduce(
    (s, p) => s.plus(p.monto),
    new Prisma.Decimal(0),
  );
  const primero = [...r.cobros].sort(
    (a, b) => a.creadoEn.getTime() - b.creadoEn.getTime(),
  )[0];
  const total = primero?.totalAcordado ?? r.total;
  return NextResponse.json(
    {
      total: total.toString(),
      precioBase: (primero?.precioBase ?? r.total).toString(),
      medioFijado: primero?.medio ?? null,
      descuentoEfectivo: primero
        ? Number(primero.descuentoEfectivo ?? 0)
        : descuentoNegocio(c.negocio.configuracion),
      abonado: abonado.toString(),
      pendiente: Prisma.Decimal.max(0, total.minus(abonado)).toString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
