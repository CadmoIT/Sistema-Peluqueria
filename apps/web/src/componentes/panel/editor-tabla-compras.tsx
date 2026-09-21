/** Permite elegir y ordenar las columnas visibles del historial de compras. */
"use client";

import { useState } from "react";
import { GripVertical, Settings2, Trash2 } from "lucide-react";
import { DialogoPanel } from "./dialogo-panel";
import { FormularioAccion } from "./formulario-accion";
import { guardarColumnasCompras } from "@/app/panel/compras/acciones";
import { nombresColumnasCompras } from "@/lib/columnas-compras";

const columnasObligatorias = new Set(["fecha", "productos", "total"]);

export function EditorTablaCompras({ columnas, variosLocales }: { columnas: string[]; variosLocales: boolean }) {
  const [abierto, abrir] = useState(false);
  const [orden, ordenar] = useState(columnas);
  const [arrastrando, arrastrar] = useState<string | null>(null);
  function mover(origen: string, destino: string) {
    const desde = orden.indexOf(origen), hasta = orden.indexOf(destino);
    if (desde < 0 || hasta < 0 || desde === hasta) return;
    const siguiente = [...orden], [movida] = siguiente.splice(desde, 1);
    if (movida) siguiente.splice(hasta, 0, movida);
    ordenar(siguiente);
  }
  return <>
    <button className="boton boton--secundario" type="button" onClick={() => { ordenar(columnas); abrir(true); }}><Settings2 /> Editar tabla</button>
    {abierto && <DialogoPanel titulo="Editar tabla" cerrar={() => abrir(false)}>
      <p>Elegí los campos que querés ver y arrastralos para cambiar su posición.</p>
      <FormularioAccion accion={guardarColumnasCompras} texto="Guardar tabla" className="formulario-dialogo editor-columnas-formulario" alGuardar={() => abrir(false)}>
        {orden.map((id) => {
          const puedeQuitar = !columnasObligatorias.has(id) && !(id === "local" && !variosLocales);
          return <div className={`columnas-fila${arrastrando === id ? " arrastrando" : ""}`} key={id} draggable onDragStart={(evento) => { arrastrar(id); evento.dataTransfer.effectAllowed = "move"; evento.dataTransfer.setData("text/plain", id); }} onDragOver={(evento) => { evento.preventDefault(); evento.dataTransfer.dropEffect = "move"; }} onDrop={(evento) => { evento.preventDefault(); if (arrastrando) mover(arrastrando, id); arrastrar(null); }} onDragEnd={() => arrastrar(null)} tabIndex={0} aria-grabbed={arrastrando === id} aria-label={`Columna ${nombresColumnasCompras[id]}`}>
            <GripVertical className="columnas-fila__arrastre" aria-hidden="true" /><input name="columnas" type="hidden" value={id} /><span>{nombresColumnasCompras[id]}</span>{puedeQuitar ? <button className="accion-icono accion-icono--eliminar columnas-fila__borrar" type="button" draggable={false} aria-label={`Quitar columna ${nombresColumnasCompras[id]}`} title={`Quitar columna ${nombresColumnasCompras[id]}`} onClick={() => ordenar((actual) => actual.filter((columna) => columna !== id))}><Trash2 aria-hidden="true" /></button> : <span className="columnas-fila__obligatoria">Obligatoria</span>}
          </div>;
        })}
      </FormularioAccion>
    </DialogoPanel>}
  </>;
}
