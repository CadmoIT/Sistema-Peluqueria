/** Lee saldo de un turno sin permitir consultar reservas de compañeros u otros negocios. */
import { Prisma } from "@prisma/client";
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
  return NextResponse.json(
    {
      total: r.total.toString(),
      abonado: abonado.toString(),
      pendiente: Prisma.Decimal.max(0, r.total.minus(abonado)).toString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
