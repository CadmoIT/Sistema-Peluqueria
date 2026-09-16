/** Crea una ficha opcional y comunica el resultado sin recargar toda la página. */
"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCliente } from "@/app/panel/clientes/acciones";
import { CamposCliente } from "./campos-cliente";
import { BotonEnvio } from "./boton-envio";
export function FormularioCliente() {
  const formulario = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [resultado, enviar] = useActionState(crearCliente, {
    ok: true,
    mensaje: "",
  });
  useEffect(() => {
    if (!resultado.mensaje) return;
    if (resultado.ok) {
      toast.success(resultado.mensaje);
      formulario.current?.reset();
      const desplegable = formulario.current?.closest("details");
      if (desplegable) desplegable.open = false;
      router.refresh();
    } else toast.error(resultado.mensaje);
  }, [resultado, router]);
  return (
    <form
      ref={formulario}
      action={enviar}
      className="formulario-flotante formulario-cliente"
    >
      <h2>Nuevo cliente</h2>
      <CamposCliente />
      {!resultado.ok && <p role="alert">{resultado.mensaje}</p>}
      <BotonEnvio pendiente="Guardando cliente…">Guardar cliente</BotonEnvio>
    </form>
  );
}
