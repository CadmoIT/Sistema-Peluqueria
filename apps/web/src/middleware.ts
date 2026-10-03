/** Resuelve los subdominios públicos y los dirige al micrositio correspondiente. */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(solicitud: NextRequest) {
  // Mantiene disponible el logo compartido también desde los subdominios públicos.
  if (solicitud.nextUrl.pathname.startsWith("/marca/")) {
    return NextResponse.next();
  }
  const dominio = process.env.PUBLIC_SITE_DOMAIN?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/+$/, "");
  const host = solicitud.nextUrl.hostname.toLowerCase();
  const sufijo = dominio && /^[a-z0-9.-]+$/.test(dominio) ? `.${dominio}` : "";
  if (sufijo && host.endsWith(sufijo)) {
    if (
      /^\/(panel|acceder|seleccionar-negocio|invitaciones|primeros-pasos|api\/autenticacion)(\/|$)/.test(
        solicitud.nextUrl.pathname,
      )
    ) {
      const principal = solicitud.nextUrl.clone();
      principal.hostname = dominio!;
      return NextResponse.redirect(principal);
    }
    const slug = host.slice(0, -sufijo.length);
    if (
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      (solicitud.nextUrl.pathname === "/" ||
        /^\/sucursal\/[a-zA-Z0-9-]+\/?$/.test(solicitud.nextUrl.pathname))
    ) {
      const destino = solicitud.nextUrl.clone();
      destino.pathname = `/sitio/${slug}${solicitud.nextUrl.pathname === "/" ? "" : solicitud.nextUrl.pathname}`;
      return NextResponse.rewrite(destino);
    }
  }
  const encabezados = new Headers(solicitud.headers);
  encabezados.set("x-turnos-ruta", solicitud.nextUrl.pathname);
  return NextResponse.next({ request: { headers: encabezados } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
