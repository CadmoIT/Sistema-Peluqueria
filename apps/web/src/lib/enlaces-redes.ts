/** Acepta el usuario de Instagram o el enlace a su perfil y devuelve una URL segura. */
export function enlaceInstagram(valor: string) {
  const entrada = valor.trim();
  if (!entrada) return "";

  if (/^https?:\/\//i.test(entrada)) {
    try {
      const url = new URL(entrada);
      const dominioValido =
        url.hostname === "instagram.com" || url.hostname === "www.instagram.com";
      return dominioValido && url.protocol === "https:"
        ? `https://www.instagram.com${url.pathname}`
        : "";
    } catch {
      return "";
    }
  }

  const usuario = entrada.replace(/^@/, "");
  return /^[a-zA-Z0-9._]+$/.test(usuario)
    ? `https://www.instagram.com/${usuario}/`
    : "";
}
