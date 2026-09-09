/** Ofrece componentes visuales accesibles y consistentes para las aplicaciones. */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export function Boton({
  className,
  variante = "primario",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma";
}) {
  return (
    <button
      className={clsx("boton", `boton--${variante}`, className)}
      {...props}
    />
  );
}

export function Tarjeta({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("tarjeta", className)} {...props} />;
}

export function Etiqueta({
  children,
  tono = "verde",
}: {
  children: ReactNode;
  tono?: "verde" | "azul" | "neutro";
}) {
  return (
    <span className={clsx("etiqueta", `etiqueta--${tono}`)}>{children}</span>
  );
}
