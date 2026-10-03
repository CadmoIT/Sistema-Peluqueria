/** Normaliza nombres y valida etiquetas DNS sin permitir hosts reservados. */
const RESERVADOS = new Set([
  "www",
  "api",
  "panel",
  "admin",
  "mail",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "site",
  "app",
  "auth",
  "acceder",
  "static",
  "assets",
  "cdn",
  "support",
  "soporte",
  "status",
  "vercel",
  "localhost",
]);

export function claveNombreNegocio(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function subdominioValido(nombre: string) {
  return (
    nombre.length >= 2 &&
    nombre.length <= 63 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nombre) &&
    !RESERVADOS.has(nombre)
  );
}

export function baseSubdominio(nombre: string) {
  return (claveNombreNegocio(nombre) || "mi-negocio").slice(0, 50);
}
