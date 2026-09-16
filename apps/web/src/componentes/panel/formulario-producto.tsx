/** Carga productos con los campos habilitados, conservando los datos de columnas ocultas. */
"use client";
import { crearProducto, actualizarProducto } from "@/app/panel/inventario/acciones";
import type { ColumnaLibre } from "@/lib/columnas-inventario";
import { FormularioAccion } from "./formulario-accion";
export type ProductoEditable = { id: string; nombre: string; precio: number; costo: number; sku: string | null; valoresPersonalizados: Array<{ columnaId: string; valor: unknown }> };
export function FormularioProducto({ producto, sedes, columnas, libres }: { producto?: ProductoEditable; sedes: Array<{ id: string; nombre: string }>; columnas: string[]; libres: ColumnaLibre[] }) {
  return <FormularioAccion accion={producto ? actualizarProducto : crearProducto} texto={producto ? "Guardar cambios" : "Guardar producto"}>
    <h2>{producto ? "Editar producto" : "Nuevo producto"}</h2>
    {producto && <input name="id" type="hidden" value={producto.id} />}
    <label>Nombre<input name="nombre" required maxLength={200} placeholder="Nombre del producto" defaultValue={producto?.nombre} /></label>
    {(!producto || columnas.includes("precio")) && <label>Precio<input name="precio" type="number" required min={0} step="0.01" defaultValue={producto?.precio} placeholder="0" /></label>}
    {columnas.includes("sku") && <label>SKU<input name="sku" maxLength={100} defaultValue={producto?.sku ?? ""} placeholder="Código del producto" /></label>}
    {columnas.includes("costo") && <label>Costo<input name="costo" type="number" min={0} step="0.01" defaultValue={producto?.costo ?? 0} /></label>}
    {!producto && <><label>Cantidad<input name="cantidad" type="number" min={0} max={1_000_000} step={1} defaultValue={0} required /></label>{sedes.length > 1 ? <label>Local<select name="sedeId" required>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label> : <input name="sedeId" type="hidden" value={sedes[0]?.id ?? ""} />}</>}
    {libres.filter((c) => columnas.includes(c.id)).map((c) => <label key={c.id}>{c.nombre}<input name={`columna:${c.id}`} type={c.tipo === "NUMERO" ? "number" : c.tipo === "FECHA" ? "date" : "text"} step={c.tipo === "NUMERO" ? "any" : undefined} maxLength={500} defaultValue={String(producto?.valoresPersonalizados.find((v) => v.columnaId === c.id)?.valor ?? "")} /></label>)}
  </FormularioAccion>;
}
