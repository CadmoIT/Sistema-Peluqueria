/** Restaura únicamente sitios retirados y con una suscripción paga vigente. */
"use server";

import { revalidatePath } from "next/cache";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { prisma } from "@/lib/prisma";
import { restaurarSitioRetirado } from "@/servicios/recuperar-sitio.service";

export async function recuperarSitio(): Promise<{ ok: boolean; mensaje: string }> {
  const { negocio, membresia } = await requerirContextoPanel();
  const resultado = await restaurarSitioRetirado(prisma, negocio.id, membresia.rol);
  if (resultado.ok) {
    revalidatePath("/panel/mi-sitio");
    revalidatePath("/sitio", "layout");
  }
  return resultado;
}
