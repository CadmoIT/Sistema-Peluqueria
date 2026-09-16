/** Confirma el borrado definitivo de una ficha y comunica restricciones sin perder historial. */
"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DialogoPanel } from "./dialogo-panel";
import { FormularioAccion } from "./formulario-accion";
import type { ResultadoAccion } from "@/servicios/eliminacion-fichas.service";
export function BotonEliminar({ id, nombre, advertencia, accion }: { id: string; nombre: string; advertencia: string; accion: (datos: FormData) => Promise<ResultadoAccion> }) {
  const [abierto, abrir] = useState(false);
  return <><button type="button" className="boton boton--secundario accion-eliminar" onClick={() => abrir(true)} aria-label={`Eliminar ${nombre}`}><Trash2 />Eliminar</button>{abierto && <DialogoPanel titulo={`¿Eliminar ${nombre}?`} cerrar={() => abrir(false)}>
    <p>{advertencia}</p><p>Se perderán los datos de la ficha. No se puede deshacer. Los importes y movimientos históricos se conservarán.</p>
    <FormularioAccion accion={accion} className="formulario-dialogo" texto="Eliminar definitivamente" alGuardar={() => abrir(false)}><input name="id" type="hidden" value={id} /></FormularioAccion>
  </DialogoPanel>}</>;
}
