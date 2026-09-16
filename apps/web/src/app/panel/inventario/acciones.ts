/** Gestiona productos, columnas y ajustes del negocio autenticado con resultados visibles. */
"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { resolverColumnas } from "@/lib/columnas-inventario";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { ajustarExistencia, guardarValoresLibres } from "@/servicios/inventario-operaciones.service";
import { eliminarFicha, type ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
function revalidar() { for (const ruta of ["inventario", "caja", "resumen", "reportes"]) revalidatePath(`/panel/${ruta}`); }
function numero(datos: FormData, campo: string) { const n = Number(datos.get(campo)); if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) throw new Error("Ingresá un precio o cantidad válido."); return n; }
async function ejecutar(operacion: (negocioId: string) => Promise<void>, mensaje: string): Promise<ResultadoAccion> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol)) return { ok: false, mensaje: "Sólo el dueño o administrador puede modificar el inventario." };
  try { await operacion(negocio.id); revalidar(); return { ok: true, mensaje }; }
  catch (error) { return { ok: false, mensaje: error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError) ? error.message : "No pudimos guardar los cambios. Intentá nuevamente." }; }
}
async function guardarProducto(negocioId: string, datos: FormData, editar: boolean) {
  const nombre = leerTexto(datos, "nombre");
  if (!nombre || nombre.length > 200) throw new Error("Ingresá un nombre de hasta 200 caracteres.");
  await prisma.$transaction(async (tx) => {
    const columnas = await tx.columnaInventario.findMany({ where: { negocioId } });
    const negocio = await tx.negocio.findUniqueOrThrow({ where: { id: negocioId }, select: { configuracion: true } });
    const habilitadas = resolverColumnas(negocio.configuracion, columnas, true);
    const datosProducto = { nombre, ...(datos.has("precio") ? { precio: new Prisma.Decimal(numero(datos, "precio")) } : {}), ...(habilitadas.includes("sku") && datos.has("sku") ? { sku: leerTexto(datos, "sku") || null } : {}), ...(habilitadas.includes("costo") && datos.has("costo") ? { costo: new Prisma.Decimal(numero(datos, "costo")) } : {}) };
    let productoId = leerTexto(datos, "id");
    if (editar) {
      const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Producto" WHERE "id"=${productoId} AND "negocioId"=${negocioId} FOR UPDATE`;
      if (!filas.length) throw new Error("El producto ya no está disponible.");
      await tx.producto.update({ where: { id: productoId }, data: datosProducto });
    } else {
      const sedes = await tx.sede.findMany({ where: { negocioId, activa: true }, select: { id: true } });
      const sedeId = sedes.length === 1 ? sedes[0]!.id : leerTexto(datos, "sedeId");
      if (!sedes.some((s) => s.id === sedeId)) throw new Error("Elegí un local válido.");
      const cantidad = numero(datos, "cantidad");
      if (!Number.isSafeInteger(cantidad) || cantidad > 1_000_000) throw new Error("Ingresá una cantidad entera de hasta 1.000.000.");
      const producto = await tx.producto.create({ data: { negocioId, precio: 0, ...datosProducto, existencias: { create: { negocioId, sedeId, cantidad } } } });
      productoId = producto.id;
      if (cantidad) await tx.movimientoStock.create({ data: { negocioId, sedeId, productoId, cantidad, tipo: "INGRESO", referencia: "Cantidad inicial" } });
    }
    const permitidos = new FormData();
    for (const columna of columnas.filter((c) => habilitadas.includes(c.id))) if (datos.has(`columna:${columna.id}`)) permitidos.set(`columna:${columna.id}`, datos.get(`columna:${columna.id}`)!);
    await guardarValoresLibres(tx, negocioId, productoId, permitidos);
  });
}
export async function crearProducto(datos: FormData) { return ejecutar((id) => guardarProducto(id, datos, false), "Producto creado."); }
export async function actualizarProducto(datos: FormData) { return ejecutar((id) => guardarProducto(id, datos, true), "Producto actualizado."); }
export async function ajustarStock(datos: FormData) { return ejecutar((id) => ajustarExistencia(prisma, id, leerTexto(datos, "productoId"), leerTexto(datos, "sedeId"), Number(datos.get("diferencia")), leerTexto(datos, "motivo")), "Cantidad actualizada."); }
export async function eliminarProducto(datos: FormData): Promise<ResultadoAccion> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol)) return { ok: false, mensaje: "Sólo el dueño o administrador puede eliminar productos." };
  try { const resultado = await eliminarFicha(prisma, negocio.id, "producto", leerTexto(datos, "id")); revalidar(); return resultado; }
  catch { return { ok: false, mensaje: "No pudimos eliminar el producto." }; }
}
export async function guardarColumnas(datos: FormData) { return ejecutar(async (id) => {
  const libres = await prisma.columnaInventario.findMany({ where: { negocioId: id } });
  const seleccion = datos.getAll("columnas").map(String);
  const columnas = resolverColumnas({ columnasInventario: seleccion }, libres, true);
  await prisma.$executeRaw`UPDATE "Negocio" SET "configuracion" = (CASE WHEN jsonb_typeof("configuracion")='object' THEN "configuracion" ELSE '{}'::jsonb END) || ${JSON.stringify({ columnasInventario: columnas })}::jsonb, "actualizadoEn"=NOW() WHERE "id"=${id}`;
}, "Tabla actualizada."); }
export async function guardarColumnaLibre(datos: FormData) { return ejecutar(async (negocioId) => {
  const nombre = leerTexto(datos, "nombre"), id = leerTexto(datos, "id"), tipo = leerTexto(datos, "tipo");
  if (!nombre || nombre.length > 60 || !["TEXTO", "NUMERO", "FECHA"].includes(tipo)) throw new Error("Ingresá un nombre de hasta 60 caracteres y un tipo válido.");
  await prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Negocio" WHERE "id"=${negocioId} FOR UPDATE`;
    if (!filas.length) throw new Error("Negocio no disponible.");
    if (id) {
      const existente = await tx.columnaInventario.findFirst({ where: { id, negocioId } });
      if (!existente) throw new Error("La columna no está disponible.");
      await tx.columnaInventario.update({ where: { id }, data: { nombre } });
    } else {
      const existentes = await tx.columnaInventario.findMany({ where: { negocioId } });
      if (existentes.length >= 20) throw new Error("Podés crear hasta 20 columnas personalizadas.");
      const nueva = await tx.columnaInventario.create({ data: { negocioId, nombre, tipo: tipo as "TEXTO" | "NUMERO" | "FECHA", orden: existentes.length } });
      const negocio = await tx.negocio.findUniqueOrThrow({ where: { id: negocioId } });
      const columnas = resolverColumnas(negocio.configuracion, existentes, true); columnas.splice(Math.max(0, columnas.indexOf("acciones")), 0, nueva.id);
      await tx.$executeRaw`UPDATE "Negocio" SET "configuracion" = (CASE WHEN jsonb_typeof("configuracion")='object' THEN "configuracion" ELSE '{}'::jsonb END) || ${JSON.stringify({ columnasInventario: columnas })}::jsonb, "actualizadoEn"=NOW() WHERE "id"=${negocioId}`;
    }
  });
}, "Columna guardada."); }
export async function eliminarColumnaLibre(datos: FormData) { return ejecutar(async (negocioId) => {
  const cambio = await prisma.columnaInventario.deleteMany({ where: { id: leerTexto(datos, "id"), negocioId } });
  if (!cambio.count) throw new Error("La columna no está disponible.");
}, "Columna y valores eliminados definitivamente."); }
