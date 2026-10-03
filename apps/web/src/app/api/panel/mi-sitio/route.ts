/** Guarda y publica el borrador autenticado del sitio del negocio. */
import { NextResponse } from "next/server";
import { tieneAccesoOperativo } from "@turnos/config";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { revalidatePath } from "next/cache";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import {
  persistirBorradorSitio,
  publicarBorradorSitio,
} from "@/servicios/mi-sitio.service";

export async function POST(request: Request) {
  if (!esOrigenMismoSitio(request)) {
    return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  }
  if (superaLimiteDeclarado(request, 1024 * 1024)) {
    return NextResponse.json(
      { error: "El formulario es demasiado grande." },
      { status: 413 },
    );
  }
  const contexto = await obtenerContextoApi();
  if (!contexto)
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (contexto.membresia.rol !== "DUENO")
    return NextResponse.json(
      { error: "Sólo el dueño puede editar el sitio." },
      { status: 403 },
    );
  if (!tieneAccesoOperativo(contexto.negocio.suscripcion))
    return NextResponse.json(
      { error: "Activá un plan para modificar tu sitio." },
      { status: 403 },
    );
  if (contexto.negocio.sitioRetiradoEn)
    return NextResponse.json(
      { error: "Primero recuperá tu sitio desde Mi sitio." },
      { status: 403 },
    );
  try {
    const datos = await request.formData();
    const { sedeId } = await persistirBorradorSitio(datos);
    const publicar = new URL(request.url).searchParams.get("publicar") === "1";

    if (publicar) {
      const resultado = await publicarBorradorSitio();
      revalidatePath("/panel/mi-sitio");
      revalidatePath(`/sitio/${resultado.negocio.slug}`);
      for (const subdominio of resultado.subdominios) {
        revalidatePath(`/sitio/${subdominio}`);
      }
      return NextResponse.json({
        redirectTo:
          "/panel/mi-sitio?local=" +
          encodeURIComponent(sedeId) +
          "&sitio=publicado",
      });
    }

    revalidatePath("/panel/mi-sitio");
    return NextResponse.json({
      redirectTo:
        "/panel/mi-sitio?local=" +
        encodeURIComponent(sedeId) +
        "&sitio=guardado",
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos guardar el borrador." },
      { status: 500 },
    );
  }
}
