/** Evita envíos duplicados y comunica visualmente el progreso de un formulario. */
"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function BotonEnvio({
  children,
  className = "boton boton--primario",
  pendiente = "Guardando…",
}: {
  children: React.ReactNode;
  className?: string;
  pendiente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? <LoaderCircle className="giro" aria-hidden /> : null}
      {pending ? pendiente : children}
    </button>
  );
}
