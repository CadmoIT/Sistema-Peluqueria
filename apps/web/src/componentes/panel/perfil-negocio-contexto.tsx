/** Comparte el rubro resuelto por el servidor sin enviar componentes ni datos privados. */
"use client";
import { createContext, useContext } from "react";
import {
  PERFILES_NEGOCIO,
  type TipoPerfilNegocio,
} from "@/lib/perfiles-negocio";

const ContextoPerfil = createContext<TipoPerfilNegocio>("general");
export function ProveedorPerfilNegocio({
  tipoNegocio,
  children,
}: {
  tipoNegocio: TipoPerfilNegocio;
  children: React.ReactNode;
}) {
  return (
    <ContextoPerfil.Provider value={tipoNegocio}>
      {children}
    </ContextoPerfil.Provider>
  );
}
export function usePerfilNegocio() {
  return PERFILES_NEGOCIO[useContext(ContextoPerfil)];
}
