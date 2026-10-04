/** Valida el negocio y confirma caja y ventas sin duplicar stock o ingresos. */
"use server";
import { importeEquipo } from "@/servicios/operaciones-equipo.service";
import { anularOperacionEquipo } from "@/servicios/operaciones-equipo.service";
import { transaccionEquipo } from "@/servicios/transaccion-equipo";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanelEditable as requerirContextoPanel } from "@/servicios/panel-datos.service";
import {
  resolverAtribucion,
  vender,
} from "@/servicios/ventas-operaciones.service";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
import type { ContextoEquipo } from "@/servicios/contexto-equipo.service";
import { exigirSedeEquipo } from "@/servicios/contexto-equipo.service";
import { registrarActividadEquipo } from "@/servicios/actividad-equipo.service";
function revalidar() {
  for (const ruta of ["caja", "inventario", "resumen", "reportes"])
    revalidatePath(`/panel/${ruta}`);
}
async function ejecutar(
  accion: (negocioId: string, contexto: ContextoEquipo) => Promise<void>,
  mensaje: string,
): Promise<ResultadoAccion> {
  const contexto = await requerirContextoPanel("venta");
  try {
    await accion(contexto.negocio.id, contexto);
    revalidar();
    return { ok: true, mensaje };
  } catch (error) {
    return {
      ok: false,
      mensaje:
        error instanceof Error &&
        !(error instanceof Prisma.PrismaClientKnownRequestError)
          ? error.message
          : "No pudimos registrar la operación. Intentá nuevamente.",
    };
  }
}
export async function registrarMovimientoCaja(datos: FormData) {
  return ejecutar(async (negocioId, c) => {
    const tipo = leerTexto(datos, "tipo"),
      concepto = leerTexto(datos, "concepto"),
      importe = importeEquipo(leerTexto(datos, "monto")),
      monto = importe.toNumber();
    if (
      tipo !== "INGRESO" ||
      !concepto ||
      concepto.length > 200 ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      monto > 1_000_000_000
    )
      throw new Error("Revisá el concepto y escribí un importe mayor a cero.");
    await transaccionEquipo(prisma, async (tx) => {
      const sedes = await tx.sede.findMany({
        where: { negocioId, activa: true },
        select: { id: true },
      });
      const sedeId =
        sedes.length === 1 ? sedes[0]!.id : leerTexto(datos, "sedeId");
      if (!sedes.some((s) => s.id === sedeId))
        throw new Error("Elegí un local válido.");
      exigirSedeEquipo(c, sedeId);
      const clave = leerTexto(datos, "idempotencia");
      if (!/^[\w-]{16,128}$/.test(clave))
        throw new Error("Volvé a abrir el formulario.");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${negocioId}:manual:${clave}`},0))::text`;
      const atribucionEntrada =
        c.identidad.rol === "PROFESIONAL"
          ? c.identidad.profesionalId!
          : leerTexto(datos, "atribucion");
      const anterior = await tx.auditoria.findFirst({
        where: { negocioId, recursoId: `manual:${clave}` },
      });
      if (anterior) {
        const d = anterior.detalle as {
          concepto: string;
          monto: number;
          sedeId: string;
          atribucion: string;
        };
        if (
          d.concepto !== concepto ||
          d.monto !== monto ||
          d.sedeId !== sedeId ||
          d.atribucion !== atribucionEntrada ||
          anterior.usuarioId !== c.usuario.id
        )
          throw new Error("La confirmación ya se usó con otros datos.");
        return;
      }
      const atribucion = await resolverAtribucion(
        tx,
        negocioId,
        c.identidad.rol === "PROFESIONAL"
          ? c.identidad.profesionalId!
          : leerTexto(datos, "atribucion"),
      );
      const m = await tx.movimientoCaja.create({
        data: {
          negocioId,
          sedeId,
          tipo: tipo as "INGRESO" | "EGRESO",
          concepto,
          monto: importe,
          ...atribucion,
          actorUsuarioId: c.usuario.id,
        },
      });
      await registrarActividadEquipo(tx, c, {
        accion: "INGRESO_MANUAL",
        recurso: "movimiento",
        recursoId: m.id,
        sedeId,
        profesionalId: atribucion.profesionalId,
        detalle: { concepto, monto },
      });
      await tx.auditoria.create({
        data: {
          negocioId,
          usuarioId: c.usuario.id,
          accion: "IDEMPOTENCIA",
          recurso: "interno",
          recursoId: `manual:${clave}`,
          detalle: { concepto, monto, sedeId, atribucion: atribucionEntrada },
        },
      });
    });
  }, "Movimiento registrado.");
}
export async function registrarVenta(datos: FormData) {
  return ejecutar(async (negocioId, c) => {
    const sedes = await prisma.sede.findMany({
      where: { negocioId, activa: true },
      select: { id: true },
    });
    const sedeId =
      sedes.length === 1 ? sedes[0]!.id : leerTexto(datos, "sedeId");
    let items: unknown;
    try {
      items = JSON.parse(leerTexto(datos, "items"));
    } catch {
      throw new Error("El carrito no es válido.");
    }
    await vender(
      prisma,
      negocioId,
      {
        sedeId,
        atribucion: leerTexto(datos, "atribucion"),
        idempotencia: leerTexto(datos, "idempotencia"),
        items,
        medio: leerTexto(datos, "medio") || "TARJETA_EXTERNA",
      },
      c,
    );
  }, "Compra confirmada. Inventario y reportes actualizados.");
}
export async function deshacerVenta(idempotencia: string) {
  return ejecutar(async (negocioId, c) => {
    const venta = await prisma.venta.findUnique({
      where: { negocioId_idempotencia: { negocioId, idempotencia } },
    });
    if (!venta) throw new Error("No se encontró la venta.");
    await anularOperacionEquipo(
      prisma,
      c,
      "venta",
      venta.id,
      "Deshacer venta rápida",
      true,
    );
  }, "Venta deshecha. Stock y caja restaurados.");
}
