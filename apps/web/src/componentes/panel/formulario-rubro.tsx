/** Permite cambiar el tipo de negocio con permisos y mensajes claros, sin modificar otros datos. */
"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarTipoNegocio } from "@/app/panel/configuracion/acciones";
import { RUBROS_NEGOCIO } from "@/lib/registro-inicial";
import type { TipoPerfilNegocio } from "@/lib/perfiles-negocio";
import { BotonEnvio } from "./boton-envio";

export function FormularioRubro({
  tipoNegocio,
  editable,
}: {
  tipoNegocio: TipoPerfilNegocio;
  editable: boolean;
}) {
  const router = useRouter();
  const [resultado, enviar, pendiente] = useActionState(actualizarTipoNegocio, {
    ok: true,
    mensaje: "",
  });
  useEffect(() => {
    if (!resultado.mensaje) return;
    if (resultado.ok) {
      toast.success(resultado.mensaje);
      router.refresh();
    } else toast.error(resultado.mensaje);
  }, [resultado, router]);
  return (
    <form action={enviar} className="ajustes-campos formulario-rubro">
      <label>
        <span>Tipo de negocio</span>
        <select
          key={tipoNegocio}
          name="tipoNegocio"
          aria-label="Tipo de negocio"
          defaultValue={tipoNegocio === "general" ? "" : tipoNegocio}
          required
          disabled={!editable || pendiente}
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {RUBROS_NEGOCIO.map(({ valor, nombre }) => (
            <option key={valor} value={valor}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
      {editable ? (
        <BotonEnvio pendiente="Guardando tipo de negocio…">
          Guardar tipo de negocio
        </BotonEnvio>
      ) : (
        <small>Sólo el dueño o un administrador puede cambiar este dato.</small>
      )}
      {!resultado.ok && <p role="alert">{resultado.mensaje}</p>}
    </form>
  );
}
