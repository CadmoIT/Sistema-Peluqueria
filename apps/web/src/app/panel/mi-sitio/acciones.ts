/** Restaura únicamente sitios retirados y con una suscripción paga vigente. */
"use server";

import { revalidatePath } from "next/cache";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { prisma } from "@/lib/prisma";
import { restaurarSitioRetirado } from "@/servicios/recuperar-sitio.service";
import { cambiarSubdominio } from "@/servicios/subdominio-negocio.service";

export async function actualizarSubdominio(_anterior: { ok: boolean; mensaje: string }, datos: FormData): Promise<{ ok: boolean; mensaje: string }> {
  const { negocio, membresia } = await requerirContextoPanel();
  const resultado = await cambiarSubdominio(prisma, negocio.id, membresia.rol, String(datos.get("subdominio") ?? ""));
  if (resultado.ok) {
    revalidatePath("/panel", "layout");
    revalidatePath("/sitio", "layout");
  }
  return resultado;
}

export async function recuperarSitio(): Promise<{ ok: boolean; mensaje: string }> {
  const { negocio, membresia } = await requerirContextoPanel();
  const resultado = await restaurarSitioRetirado(prisma, negocio.id, membresia.rol);
  if (resultado.ok) {
    revalidatePath("/panel/mi-sitio");
    revalidatePath("/sitio", "layout");
  }
  return resultado;
}
