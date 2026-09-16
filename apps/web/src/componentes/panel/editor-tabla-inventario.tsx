/** Permite elegir, ordenar y renombrar columnas, confirmando el borrado de sus valores. */
"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Settings2 } from "lucide-react";
import { nombresColumnas, type ColumnaLibre } from "@/lib/columnas-inventario";
import { guardarColumnas, guardarColumnaLibre, eliminarColumnaLibre } from "@/app/panel/inventario/acciones";
import { DialogoPanel } from "./dialogo-panel";
import { FormularioAccion } from "./formulario-accion";
export function EditorTablaInventario({ columnas, libres, variosLocales }: { columnas: string[]; libres: ColumnaLibre[]; variosLocales: boolean }) {
  const [abierto, abrir] = useState(false), [orden, ordenar] = useState(columnas), [eliminando, eliminar] = useState<ColumnaLibre | null>(null);
  const disponibles = [...Object.keys(nombresColumnas).filter((id) => id !== "local" || variosLocales), ...libres.map((c) => c.id)];
  function mover(indice: number, delta: number) { const siguientes = [...orden]; [siguientes[indice], siguientes[indice + delta]] = [siguientes[indice + delta]!, siguientes[indice]!]; ordenar(siguientes); }
  return <><button className="boton boton--secundario" type="button" onClick={() => { ordenar(columnas); abrir(true); }}><Settings2 />Editar tabla</button>
    {abierto && <DialogoPanel titulo="Editar tabla" cerrar={() => abrir(false)}><p>Elegí las columnas que necesitás. Ocultar SKU o Costo conserva sus datos. Las columnas libres se comparten entre locales.</p>
      <FormularioAccion accion={guardarColumnas} texto="Guardar tabla" className="formulario-dialogo" alGuardar={() => abrir(false)}>
        {orden.map((id, i) => <div className="columnas-fila" key={id}><input name="columnas" type="hidden" value={id} /><span>{nombresColumnas[id] ?? libres.find((c) => c.id === id)?.nombre}</span><button className="accion-icono" type="button" aria-label="Mover columna arriba" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp /></button><button className="accion-icono" type="button" aria-label="Mover columna abajo" disabled={i === orden.length - 1} onClick={() => mover(i, 1)}><ArrowDown /></button>{!["nombre", "cantidad", "acciones"].includes(id) && <button className="boton boton--secundario" type="button" onClick={() => ordenar(orden.filter((c) => c !== id))}>Ocultar</button>}</div>)}
        {disponibles.filter((id) => !orden.includes(id)).map((id) => <button key={id} type="button" className="boton boton--secundario" onClick={() => ordenar([...orden, id])}>Mostrar {nombresColumnas[id] ?? libres.find((c) => c.id === id)?.nombre}</button>)}
      </FormularioAccion>
      <h3>Nueva columna</h3><FormularioAccion accion={guardarColumnaLibre} texto="Agregar columna" className="formulario-dialogo"><label>Nombre<input name="nombre" required maxLength={60} placeholder="Por ejemplo, Fecha de vencimiento" /></label><label>Tipo<select name="tipo"><option value="TEXTO">Texto</option><option value="NUMERO">Número</option><option value="FECHA">Fecha</option></select></label></FormularioAccion>
      {libres.map((c) => <section className="columna-edicion" key={c.id}><FormularioAccion accion={guardarColumnaLibre} texto="Renombrar" className="formulario-dialogo"><input name="id" type="hidden" value={c.id} /><input name="tipo" type="hidden" value={c.tipo} /><label>Nombre de columna<input name="nombre" required maxLength={60} defaultValue={c.nombre} /></label></FormularioAccion><button type="button" className="boton boton--secundario accion-eliminar" onClick={() => eliminar(c)}>Eliminar columna</button></section>)}
    </DialogoPanel>}
    {eliminando && <DialogoPanel titulo={`¿Eliminar ${eliminando.nombre}?`} cerrar={() => eliminar(null)}><p>Se eliminará esta columna y todos sus valores en todos los productos. No se puede deshacer.</p><FormularioAccion accion={eliminarColumnaLibre} texto="Eliminar columna y valores" className="formulario-dialogo" alGuardar={() => { eliminar(null); abrir(false); }}><input name="id" type="hidden" value={eliminando.id} /></FormularioAccion></DialogoPanel>}
  </>;
}
