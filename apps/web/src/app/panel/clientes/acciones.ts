/** Implementa las altas y bajas de clientes dentro del negocio autenticado. */
"use server";

import { revalidatePath } from "next/cache";
import { leerTexto, textoOpcional } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";

export async function crearCliente(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const email = leerTexto(datos, "email").toLowerCase();
  const telefono = leerTexto(datos, "telefono").replace(/[^+\d]/g, "");

  await prisma.cliente.create({
    data: {
      negocioId: negocio.id,
      nombre: textoOpcional(leerTexto(datos, "nombre")),
      apellido: textoOpcional(leerTexto(datos, "apellido")),
      email: textoOpcional(email),
      telefono: textoOpcional(telefono),
      notas: textoOpcional(leerTexto(datos, "notas")),
    },
  });

  revalidatePath("/panel/clientes");
}

export async function eliminarCliente(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");

  await prisma.cliente.deleteMany({
    where: {
      id,
      negocioId: negocio.id,
      reservas: { none: {} },
    },
  });

  revalidatePath("/panel/clientes");
}

export async function actualizarCliente(datos: FormData) {
  const { negocio } = await requerirContextoPanel();
  const id = leerTexto(datos, "id");
  const email = leerTexto(datos, "email").toLowerCase();
  const telefono = leerTexto(datos, "telefono").replace(/[^+\d]/g, "");

  await prisma.cliente.updateMany({
    where: { id, negocioId: negocio.id },
    data: {
      nombre: textoOpcional(leerTexto(datos, "nombre")),
      apellido: textoOpcional(leerTexto(datos, "apellido")),
      email: textoOpcional(email),
      telefono: textoOpcional(telefono),
      notas: textoOpcional(leerTexto(datos, "notas")),
    },
  });

  revalidatePath("/panel/clientes");
}
