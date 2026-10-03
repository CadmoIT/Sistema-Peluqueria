/** Construye URLs de micrositio por subdominio y conserva las rutas en local. */
export function enlaceSitioPublico(slug: string, sedeId?: string) {
  const rutaSede = sedeId ? `/sucursal/${encodeURIComponent(sedeId)}` : "";
  const dominio = process.env.PUBLIC_SITE_DOMAIN?.trim().toLowerCase();
  if (!dominio) return `/sitio/${encodeURIComponent(slug)}${rutaSede}`;

  const host = dominio
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/+$/, "");
  if (!/^[a-z0-9.-]+$/.test(host)) {
    return `/sitio/${encodeURIComponent(slug)}${rutaSede}`;
  }
  return `https://${encodeURIComponent(slug)}.${host}${rutaSede}`;
}
