/** Unifica formularios apilados, etiquetas sobre el borde y mensajes de resultado. */
"use client";
import { Children, cloneElement, isValidElement, useRef, useTransition, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
function transformar(children: ReactNode): ReactNode {
  return Children.map(children, (nodo) => {
    if (!isValidElement(nodo)) return nodo;
    const elemento = nodo as ReactElement<{ children?: ReactNode; className?: string; type?: string }>;
    const hijos = Children.toArray(elemento.props.children);
    const seleccion = hijos.some((h) => isValidElement(h) && (h.props as { type?: string }).type && ["checkbox", "radio", "hidden"].includes((h.props as { type: string }).type));
    if (elemento.type === "label" && !seleccion) return cloneElement(elemento, { className: `${elemento.props.className ?? ""} campo-apilado` }, hijos.map((h, i) => typeof h === "string" && h.trim() ? <span className="campo-apilado__etiqueta" key={i}>{h.trim()}</span> : transformar(h)));
    if (typeof elemento.type !== "string") return elemento;
    return cloneElement(elemento, {}, transformar(elemento.props.children));
  });
}
export function CamposApilados({ children }: { children: ReactNode }) { return <div className="formulario-apilado">{transformar(children)}</div>; }
export function FormularioAccion({ accion, children, texto = "Guardar", mensaje = "Cambios guardados.", className = "formulario-flotante", alGuardar }: { accion: (datos: FormData) => Promise<ResultadoAccion | void>; children: ReactNode; texto?: string; mensaje?: string; className?: string; alGuardar?: () => void }) {
  const router = useRouter(), ref = useRef<HTMLFormElement>(null);
  const [pendiente, iniciar] = useTransition();
  return <form ref={ref} className={className} action={(datos) => iniciar(async () => {
    try {
      const resultado = await accion(datos);
      if (resultado && !resultado.ok) { toast.error(resultado.mensaje); return; }
      toast.success(resultado?.mensaje ?? mensaje);
      if (alGuardar) alGuardar(); else { const details = ref.current?.closest("details"); if (details) details.open = false; }
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No pudimos guardar los cambios."); }
  })}><CamposApilados>{children}</CamposApilados><button className="boton boton--primario" disabled={pendiente} aria-busy={pendiente}>{pendiente && <LoaderCircle className="spinner" />}{pendiente ? "Guardando…" : texto}</button></form>;
}
