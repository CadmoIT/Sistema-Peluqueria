/** Valida el negocio y confirma caja y ventas sin duplicar stock o ingresos. */
"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { resolverAtribucion, vender } from "@/servicios/ventas-operaciones.service";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
function revalidar() { for (const ruta of ["caja", "inventario", "resumen", "reportes"]) revalidatePath(`/panel/${ruta}`); }
async function ejecutar(accion: (negocioId: string) => Promise<void>, mensaje: string): Promise<ResultadoAccion> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol)) return { ok: false, mensaje: "Sólo el dueño o administrador puede registrar caja." };
  try { await accion(negocio.id); revalidar(); return { ok: true, mensaje }; }
  catch (error) { return { ok: false, mensaje: error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : "No pudimos registrar la operación. Intentá nuevamente." }; }
}
export async function registrarMovimientoCaja(datos: FormData) { return ejecutar(async (negocioId) => {
  const tipo = leerTexto(datos, "tipo"), concepto = leerTexto(datos, "concepto"), monto = Number(datos.get("monto"));
  if (!["INGRESO", "EGRESO"].includes(tipo) || !concepto || concepto.length > 200 || !Number.isFinite(monto) || monto <= 0 || monto > 1_000_000_000) throw new Error("Revisá el concepto y escribí un importe mayor a cero.");
  await prisma.$transaction(async (tx) => {
    const sedes = await tx.sede.findMany({ where: { negocioId, activa: true }, select: { id: true } });
    const sedeId = sedes.length === 1 ? sedes[0]!.id : leerTexto(datos, "sedeId");
    if (!sedes.some((s) => s.id === sedeId)) throw new Error("Elegí un local válido.");
    const atribucion = await resolverAtribucion(tx, negocioId, leerTexto(datos, "atribucion"));
    await tx.movimientoCaja.create({ data: { negocioId, sedeId, tipo: tipo as "INGRESO" | "EGRESO", concepto, monto: new Prisma.Decimal(monto), ...atribucion } });
  });
}, "Movimiento registrado."); }
export async function registrarVenta(datos: FormData) { return ejecutar(async (negocioId) => {
  const sedes = await prisma.sede.findMany({ where: { negocioId, activa: true }, select: { id: true } });
  const sedeId = sedes.length === 1 ? sedes[0]!.id : leerTexto(datos, "sedeId");
  let items: unknown; try { items = JSON.parse(leerTexto(datos, "items")); } catch { throw new Error("El carrito no es válido."); }
  await vender(prisma, negocioId, { sedeId, atribucion: leerTexto(datos, "atribucion"), idempotencia: leerTexto(datos, "idempotencia"), items });
}, "Compra confirmada. Inventario y reportes actualizados."); }
