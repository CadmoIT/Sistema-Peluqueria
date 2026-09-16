/** Guarda datos opcionales y elimina clientes sin borrar los importes históricos. */
"use server";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { normalizarDatos, errorDatos } from "@/lib/clientes-archivo";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { eliminarFicha, type ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
export type ResultadoCliente = ResultadoAccion;
function invalidarClientes() {
  for (const ruta of ["clientes", "resumen", "agenda", "reportes", "caja"]) revalidatePath(`/panel/${ruta}`);
}
async function guardar(datos: FormData, editar: boolean): Promise<ResultadoCliente> {
  const { negocio } = await requerirContextoPanel();
  try {
    const entrada = normalizarDatos(Object.fromEntries(datos));
    const error = errorDatos(entrada);
    if (error) return { ok: false, mensaje: error };
    if (editar) {
      await prisma.$transaction(async (tx) => {
        const existente = await tx.cliente.findFirst({ where: { id: leerTexto(datos, "id"), negocioId: negocio.id } });
        if (!existente) throw new Error("El cliente ya no está disponible.");
        const completo = [existente.nombre, existente.apellido].filter(Boolean).join(" ");
        const mantener = !datos.has("apellido") && entrada.nombre === completo;
        await tx.cliente.update({ where: { id: existente.id }, data: { ...entrada, nombre: mantener ? existente.nombre : entrada.nombre, apellido: mantener ? existente.apellido : entrada.apellido } });
      });
    } else await prisma.cliente.create({ data: { negocioId: negocio.id, ...entrada } });
    invalidarClientes();
    return { ok: true, mensaje: editar ? "Datos del cliente actualizados." : "Cliente creado." };
  } catch (error) { return { ok: false, mensaje: error instanceof Error ? error.message : "No pudimos guardar el cliente." }; }
}
export async function crearCliente(_anterior: ResultadoCliente, datos: FormData) { return guardar(datos, false); }
export async function actualizarCliente(datos: FormData) { return guardar(datos, true); }
export async function eliminarCliente(datos: FormData): Promise<ResultadoCliente> {
  const { negocio, membresia } = await requerirContextoPanel();
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol)) return { ok: false, mensaje: "Sólo el dueño o administrador puede eliminar fichas." };
  try { const resultado = await eliminarFicha(prisma, negocio.id, "cliente", leerTexto(datos, "id")); invalidarClientes(); return resultado; }
  catch { return { ok: false, mensaje: "No pudimos eliminar el cliente. Intentá nuevamente." }; }
}
