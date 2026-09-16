/** Comparte diálogos accesibles que se cierran al tocar afuera o presionar Escape. */
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useCierreExterior } from "@/componentes/interaccion/cierre-exterior";
export function DialogoPanel({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useCierreExterior(ref, cerrar, true);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="dialogo-turno dialogo-panel" aria-label={titulo} onClose={cerrar}>
    <header><h2>{titulo}</h2><button className="accion-icono" type="button" aria-label="Cerrar" onClick={cerrar}><X /></button></header>
    {children}
  </dialog>;
}
