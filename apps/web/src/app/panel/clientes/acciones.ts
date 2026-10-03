/** Guarda datos opcionales y elimina clientes sin borrar los importes históricos. */
"use server";
import { mensajeErrorEquipo } from "@/lib/errores-equipo";
import { revalidatePath } from "next/cache";
import { leerTexto } from "@/lib/formularios";
import { normalizarDatos, errorDatos } from "@/lib/clientes-archivo";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanelEditable as requerirContextoPanel } from "@/servicios/panel-datos.service";
import {
  eliminarFicha,
  type ResultadoAccion,
} from "@/servicios/eliminacion-fichas.service";
import { vincularClienteEquipo } from "@/servicios/clientes-equipo.service";
import { registrarActividadEquipo } from "@/servicios/actividad-equipo.service";
export type ResultadoCliente = ResultadoAccion;
function invalidarClientes() {
  for (const ruta of ["clientes", "resumen", "agenda", "reportes", "caja"])
    revalidatePath(`/panel/${ruta}`);
}
async function guardar(
  datos: FormData,
  editar: boolean,
): Promise<ResultadoCliente> {
  const c = await requerirContextoPanel("clientes");
  const { negocio } = c;
  try {
    const entrada = normalizarDatos(Object.fromEntries(datos));
    const error = errorDatos(entrada);
    if (error) return { ok: false, mensaje: error };
    if (editar) {
      await prisma.$transaction(async (tx) => {
        const existente = await tx.cliente.findFirst({
          where: {
            id: leerTexto(datos, "id"),
            negocioId: negocio.id,
            ...(c.identidad.rol === "PROFESIONAL"
              ? {
                  profesionales: {
                    some: { profesionalId: c.identidad.profesionalId! },
                  },
                }
              : {}),
          },
        });
        if (!existente) throw new Error("El cliente ya no está disponible.");
        const completo = [existente.nombre, existente.apellido]
          .filter(Boolean)
          .join(" ");
        const mantener = !datos.has("apellido") && entrada.nombre === completo;
        await tx.cliente.update({
          where: { id: existente.id },
          data: {
            ...entrada,
            nombre: mantener ? existente.nombre : entrada.nombre,
            apellido: mantener ? existente.apellido : entrada.apellido,
          },
        });
        await registrarActividadEquipo(tx, c, {
          accion: "ACTUALIZAR_CONTACTO",
          recurso: "cliente",
          recursoId: existente.id,
          profesionalId: c.identidad.profesionalId,
          detalle: { campos: Object.keys(entrada) },
        });
      });
    } else
      await prisma.$transaction(
        async (tx) => {
          const contactos = [
            ...(entrada.email
              ? [
                  {
                    email: {
                      equals: entrada.email,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            ...(entrada.telefono ? [{ telefono: entrada.telefono }] : []),
          ];
          if (
            contactos.length &&
            (await tx.cliente.count({
              where: { negocioId: negocio.id, OR: contactos },
            }))
          )
            throw new Error(
              "Ese contacto ya tiene una ficha. Vinculalo al crear un turno con su contacto exacto o pedile al dueño que revise la ficha.",
            );
          const cliente = await tx.cliente.create({
            data: { negocioId: negocio.id, ...entrada },
          });
          if (c.identidad.profesionalId)
            await vincularClienteEquipo(
              tx,
              c.identidad.profesionalId,
              cliente.id,
            );
          await registrarActividadEquipo(tx, c, {
            accion: "CREAR_CLIENTE",
            recurso: "cliente",
            recursoId: cliente.id,
            profesionalId: c.identidad.profesionalId,
          });
        },
        { isolationLevel: "Serializable" },
      );
    invalidarClientes();
    return {
      ok: true,
      mensaje: editar ? "Datos del cliente actualizados." : "Cliente creado.",
    };
  } catch (error) {
    return { ok: false, mensaje: mensajeErrorEquipo(error) };
  }
}
export async function crearCliente(
  _anterior: ResultadoCliente,
  datos: FormData,
) {
  return guardar(datos, false);
}
export async function actualizarCliente(datos: FormData) {
  return guardar(datos, true);
}
export async function guardarNotaCliente(
  datos: FormData,
): Promise<ResultadoCliente> {
  const c = await requerirContextoPanel("clientes"),
    clienteId = leerTexto(datos, "clienteId"),
    profesionalId = c.identidad.profesionalId;
  if (!profesionalId)
    return {
      ok: false,
      mensaje:
        "Las notas personales se editan desde la cuenta del profesional.",
    };
  const notas = leerTexto(datos, "notas");
  if (notas.length > 4000)
    return { ok: false, mensaje: "La nota admite hasta 4000 caracteres." };
  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      negocioId: c.negocio.id,
      profesionales: { some: { profesionalId } },
    },
    select: { id: true },
  });
  if (!cliente) return { ok: false, mensaje: "El cliente no está disponible." };
  await prisma.$transaction(async (tx) => {
    await tx.profesionalCliente.update({
      where: { profesionalId_clienteId: { profesionalId, clienteId } },
      data: { notas: notas || null },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "NOTA_CLIENTE",
      recurso: "cliente",
      recursoId: clienteId,
      profesionalId,
    });
  });
  invalidarClientes();
  return {
    ok: true,
    mensaje:
      "Nota personal guardada. El dueño puede consultarla; otros empleados no.",
  };
}
export async function eliminarCliente(
  datos: FormData,
): Promise<ResultadoCliente> {
  const c = await requerirContextoPanel();
  const { negocio, membresia } = c;
  if (!["DUENO", "ADMINISTRADOR"].includes(membresia.rol))
    return {
      ok: false,
      mensaje: "Sólo el dueño o administrador puede eliminar fichas.",
    };
  try {
    const resultado = await eliminarFicha(
      prisma,
      negocio.id,
      "cliente",
      leerTexto(datos, "id"),
      c,
    );
    invalidarClientes();
    return resultado;
  } catch {
    return {
      ok: false,
      mensaje: "No pudimos eliminar el cliente. Intentá nuevamente.",
    };
  }
}
