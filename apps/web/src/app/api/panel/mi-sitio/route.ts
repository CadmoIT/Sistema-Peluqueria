/** Guarda y publica el borrador autenticado del sitio del negocio. */
import { NextResponse } from "next/server";
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
