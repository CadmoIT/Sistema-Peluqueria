/** Muestra sólo los campos esenciales del servicio y confirma cada envío sin dobles acciones. */
"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  guardarServicio,
  alternarServicio,
  type ResultadoServicio,
} from "@/app/panel/servicios/acciones";
import { BotonEnvio } from "./boton-envio";
import { usePerfilNegocio } from "./perfil-negocio-contexto";
import { CamposApilados } from "./formulario-accion";
type Opcion = { id: string; nombre: string };
export type ServicioEditable = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  duracionMinutos: number;
  porcentajeSena: number;
  profesionalIds: string[];
  sedeIds: string[];
};
function useResultado(
  resultado: ResultadoServicio,
  formulario?: React.RefObject<HTMLFormElement | null>,
) {
  const router = useRouter();
  useEffect(() => {
    if (!resultado.mensaje) return;
    if (!resultado.ok) {
      toast.error(resultado.mensaje);
      return;
    }
    toast.success(resultado.mensaje);
    const desplegable = formulario?.current?.closest("details");
    if (desplegable) desplegable.open = false;
    router.refresh();
  }, [resultado, router, formulario]);
}
export function FormularioServicio({
  profesionales,
  sedes,
  servicio,
}: {
  profesionales: Opcion[];
  sedes: Opcion[];
  servicio?: ServicioEditable;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const perfil = usePerfilNegocio();
  const [resultado, enviar] = useActionState(guardarServicio, {
    ok: true,
    mensaje: "",
  });
  useResultado(resultado, formulario);
  return (
    <form
      ref={formulario}
      action={enviar}
      className="formulario-flotante formulario-servicio"
    >
      <h2>{servicio ? "Editar servicio" : "Nuevo servicio"}</h2>
      <CamposApilados>
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      <label>
        Nombre
        <input
          name="nombre"
          placeholder={`Por ejemplo, ${perfil.ejemploServicio}`}
          required
          minLength={2}
          maxLength={200}
          defaultValue={servicio?.nombre}
        />
      </label>
      <label>
        Categoría
        <input
          name="categoria"
          maxLength={100}
          placeholder={`Por ejemplo, ${perfil.ejemploCategoria}`}
          defaultValue={servicio?.categoria}
        />
      </label>
      <div className="form-grid">
        <label>
          Precio
          <input
            name="precio"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={servicio?.precio}
          />
        </label>
        <label>
          Duración (minutos)
          <input
            name="duracionMinutos"
            type="number"
            min="5"
            max="1440"
            step="5"
            defaultValue={servicio?.duracionMinutos ?? 30}
            required
          />
        </label>
      </div>
      <label>
        Seña (%)
        <input
          name="porcentajeSena"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={servicio?.porcentajeSena ?? 0}
        />
      </label>
      {profesionales.length === 1 ? (
        <input
          type="hidden"
          name="profesionalIds"
          value={profesionales[0]!.id}
        />
      ) : (
        profesionales.length > 1 && (
          <fieldset className="selector-multiple">
            <legend>Profesionales que lo realizan</legend>
            {profesionales.map((profesional) => (
              <label key={profesional.id}>
                <input
                  type="checkbox"
                  name="profesionalIds"
                  value={profesional.id}
                  defaultChecked={
                    !servicio ||
                    servicio.profesionalIds.includes(profesional.id)
                  }
                />
                {profesional.nombre}
              </label>
            ))}
          </fieldset>
        )
      )}
      {sedes.length === 1 ? (
        <input type="hidden" name="sedeIds" value={sedes[0]!.id} />
      ) : (
        sedes.length > 1 && (
          <fieldset className="selector-multiple">
            <legend>Locales donde se ofrece</legend>
            {sedes.map((sede) => (
              <label key={sede.id}>
                <input
                  type="checkbox"
                  name="sedeIds"
                  value={sede.id}
                  defaultChecked={
                    !servicio || servicio.sedeIds.includes(sede.id)
                  }
                />
                {sede.nombre}
              </label>
            ))}
          </fieldset>
        )
      )}
      {!resultado.ok && <p role="alert">{resultado.mensaje}</p>}
      </CamposApilados>
      <BotonEnvio pendiente="Guardando servicio…">
        {servicio ? "Guardar cambios" : "Guardar servicio"}
      </BotonEnvio>
    </form>
  );
}
export function VisibilidadServicio({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [resultado, enviar] = useActionState(alternarServicio, {
    ok: true,
    mensaje: "",
  });
  useResultado(resultado);
  return (
    <form action={enviar}>
      <input type="hidden" name="id" value={id} />
      <BotonEnvio className="boton boton--secundario" pendiente="Actualizando…">
        {activo ? (
          <>
            <EyeOff /> Ocultar
          </>
        ) : (
          <>
            <Eye /> Publicar
          </>
        )}
      </BotonEnvio>
    </form>
  );
}
