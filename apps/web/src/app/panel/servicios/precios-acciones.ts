/** Sólo el dueño configura la política de cobro del negocio. */
"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requerirContextoPanelEditable } from "@/servicios/panel-datos.service";
import { prisma } from "@/lib/prisma";
import { transaccionEquipo } from "@/servicios/transaccion-equipo";
import { registrarActividadEquipo } from "@/servicios/actividad-equipo.service";
export async function guardarDescuento(datos: FormData) {
  const c = await requerirContextoPanelEditable("dueno");
  const texto = String(datos.get("descuento") ?? "");
  const descuento = Number(texto);
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(texto) || descuento > 99)
    return {
      ok: false,
      mensaje: "Ingresá un porcentaje entre 0 y 99, con hasta dos decimales.",
    };
  await transaccionEquipo(prisma, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id"=${c.negocio.id} FOR UPDATE`;
    const n = await tx.negocio.findUniqueOrThrow({
      where: { id: c.negocio.id },
    });
    await tx.negocio.update({
      where: { id: n.id },
      data: {
        configuracion: {
          ...((n.configuracion as Prisma.JsonObject) ?? {}),
          descuentoEfectivo: descuento,
        },
      },
    });
    await registrarActividadEquipo(tx, c, {
      accion: "CAMBIAR_DESCUENTO",
      recurso: "servicio",
      recursoId: n.id,
      detalle: { descuentoEfectivo: descuento },
    });
  });
  for (const ruta of ["servicios", "caja", "mi-sitio"])
    revalidatePath(`/panel/${ruta}`);
  revalidatePath("/sitio", "layout");
  return { ok: true, mensaje: "Descuento de efectivo actualizado." };
}
