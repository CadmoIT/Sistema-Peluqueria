/** Resuelve los subdominios públicos y los dirige al micrositio correspondiente. */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(solicitud: NextRequest) {
  // Mantiene disponible el logo compartido también desde los subdominios públicos.
  if (solicitud.nextUrl.pathname.startsWith("/marca/")) {
    return NextResponse.next();
  }
  const dominio = process.env.PUBLIC_SITE_DOMAIN
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/+$/, "");
  const host = solicitud.nextUrl.hostname.toLowerCase();
  const sufijo =
    dominio && /^[a-z0-9.-]+$/.test(dominio) ? `.${dominio}` : "";
  if (sufijo && host.endsWith(sufijo)) {
    const slug = host.slice(0, -sufijo.length);
    if (
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      solicitud.nextUrl.pathname === "/"
    ) {
      const destino = solicitud.nextUrl.clone();
      destino.pathname = `/sitio/${slug}`;
      return NextResponse.rewrite(destino);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
