/** Resuelve los subdominios públicos y los dirige al micrositio correspondiente. */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(solicitud: NextRequest) {
  const host =
    (solicitud.headers.get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  const sufijo = ".site.turnosrapidos.com.ar";
  if (host.endsWith(sufijo)) {
    const slug = host.slice(0, -sufijo.length);
    if (slug && !solicitud.nextUrl.pathname.startsWith("/sitio/")) {
      const destino = solicitud.nextUrl.clone();
      destino.pathname = `/sitio/${slug}${solicitud.nextUrl.pathname === "/" ? "" : solicitud.nextUrl.pathname}`;
      return NextResponse.rewrite(destino);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
