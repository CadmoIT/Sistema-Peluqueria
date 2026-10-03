/** Acciones operativas del equipo con autorización y resultados controlados. */
"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanelEditable } from "@/servicios/panel-datos.service";
import {
  registrarConsumoEquipo,
  comprarEquipo,
  cobrarTurnoEquipo,
  anularOperacionEquipo,
} from "@/servicios/operaciones-equipo.service";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
function texto(d: FormData, campo: string) {
  return String(d.get(campo) ?? "");
}
async function ejecutar(
  operacion: () => Promise<unknown>,
): Promise<ResultadoAccion> {
  try {
    await operacion();
    revalidatePath("/panel", "layout");
    return { ok: true, mensaje: "Operación registrada." };
  } catch (e) {
    return {
      ok: false,
      mensaje:
        e instanceof Error &&
        !(e instanceof Prisma.PrismaClientKnownRequestError) &&
        !(e instanceof Prisma.PrismaClientValidationError)
          ? e.message
          : "No pudimos registrar la operación.",
    };
  }
}
export async function registrarConsumo(d: FormData) {
  const c = await requerirContextoPanelEditable("consumo");
  return ejecutar(() =>
    registrarConsumoEquipo(prisma, c, {
      sedeId: texto(d, "sedeId"),
      productoId: texto(d, "productoId"),
      cantidad: Number(d.get("cantidad")),
      motivo: texto(d, "motivo"),
      idempotencia: texto(d, "idempotencia"),
    }),
  );
}
export async function registrarCompraExistente(d: FormData) {
  const c = await requerirContextoPanelEditable("compra");
  return ejecutar(() => {
    let items;
    try {
      items = JSON.parse(texto(d, "items"));
    } catch {
      throw new Error("Revisá los productos de la compra.");
    }
    return comprarEquipo(prisma, c, {
      sedeId: texto(d, "sedeId"),
      proveedor: texto(d, "proveedor"),
      idempotencia: texto(d, "idempotencia"),
      items,
    });
  });
}
export async function registrarCobro(d: FormData) {
  const c = await requerirContextoPanelEditable("venta");
  return ejecutar(() =>
    cobrarTurnoEquipo(prisma, c, {
      reservaId: texto(d, "reservaId"),
      monto: texto(d, "monto"),
      medio: texto(d, "medio"),
      idempotencia: texto(d, "idempotencia"),
    }),
  );
}
export async function anularOperacion(d: FormData) {
  const c = await requerirContextoPanelEditable("dueno");
  return ejecutar(() =>
    anularOperacionEquipo(
      prisma,
      c,
      texto(d, "tipo"),
      texto(d, "id"),
      texto(d, "motivo"),
    ),
  );
}
