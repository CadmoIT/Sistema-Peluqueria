/** Comparte el rol visual; los permisos reales se validan en el servidor. */
"use client";
import { createContext, useContext, type ReactNode } from "react";
const Contexto = createContext<"DUENO" | "ADMINISTRADOR" | "PROFESIONAL">(
  "DUENO",
);
export function ProveedorEquipo({
  rol,
  children,
}: {
  rol: "DUENO" | "ADMINISTRADOR" | "PROFESIONAL";
  children: ReactNode;
}) {
  return <Contexto.Provider value={rol}>{children}</Contexto.Provider>;
}
export function useRolEquipo() {
  return useContext(Contexto);
}
