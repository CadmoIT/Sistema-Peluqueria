/** Comprueba que una solicitud mutante venga del mismo origen del sitio. */
export function esOrigenMismoSitio(
  solicitud: Pick<Request, "headers" | "url">,
) {
  const origen = solicitud.headers.get("origin");
  if (!origen) return false;

  try {
    return new URL(origen).origin === new URL(solicitud.url).origin;
  } catch {
    return false;
  }
}
