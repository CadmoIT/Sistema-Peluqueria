/** Reglas puras de autorización y privacidad para las cuentas del equipo. */
export type IdentidadEquipo = {
  rol: "DUENO" | "ADMINISTRADOR" | "PROFESIONAL";
  profesionalId: string | null;
  sedeIds: string[];
};
export type PermisoEquipo =
  | "administrar"
  | "dueno"
  | "agenda"
  | "clientes"
  | "venta"
  | "compra"
  | "consumo";
type ContextoAutorizable = { identidad: IdentidadEquipo };
export function exigirPermisoEquipo(
  contexto: ContextoAutorizable,
  permiso: PermisoEquipo,
) {
  if (!permiteEquipo(contexto.identidad, permiso))
    throw new Error("No tenés permiso para esta operación.");
}
export function exigirSedeEquipo(
  contexto: ContextoAutorizable,
  sedeId: string,
) {
  if (
    contexto.identidad.rol === "PROFESIONAL" &&
    !contexto.identidad.sedeIds.includes(sedeId)
  )
    throw new Error("El local no está disponible para tu cuenta.");
}
export function exigirProfesionalEquipo(
  contexto: ContextoAutorizable,
  profesionalId: string | null,
) {
  if (
    contexto.identidad.rol === "PROFESIONAL" &&
    contexto.identidad.profesionalId !== profesionalId
  )
    throw new Error("El turno no está disponible para tu cuenta.");
}
export function permiteEquipo(
  identidad: IdentidadEquipo,
  permiso: PermisoEquipo,
) {
  if (permiso === "dueno") return identidad.rol === "DUENO";
  if (identidad.rol !== "PROFESIONAL") return true;
  return Boolean(identidad.profesionalId) && permiso !== "administrar";
}
export function normalizarEmailEquipo(email: string) {
  return email.trim().toLowerCase();
}
export function emailEquipoValido(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function detalleActividadPermitido(
  identidad: IdentidadEquipo,
  fila: { profesionalId: string | null; visibilidad: string },
) {
  return (
    identidad.rol !== "PROFESIONAL" ||
    fila.visibilidad === "COMPARTIDA" ||
    fila.profesionalId === identidad.profesionalId
  );
}
