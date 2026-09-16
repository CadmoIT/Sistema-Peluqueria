/** Muestra una tabla abierta con búsqueda, cantidades por local y ajustes seguros. */
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ajustarStock, eliminarProducto } from "@/app/panel/inventario/acciones";
import { nombresColumnas, type ColumnaLibre } from "@/lib/columnas-inventario";
import { FormularioProducto, type ProductoEditable } from "./formulario-producto";
import { FormularioAccion } from "./formulario-accion";
import { BotonEliminar } from "./boton-eliminar";
import { EditorTablaInventario } from "./editor-tabla-inventario";
const dinero = (valor: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(valor);
type Producto = ProductoEditable & { existencias: Array<{ sedeId: string; cantidad: number; sede: { nombre: string } }> };
export function TablaInventario({ productos, sedes, columnas, libres }: { productos: Producto[]; sedes: Array<{ id: string; nombre: string }>; columnas: string[]; libres: ColumnaLibre[] }) {
  const [buscar, cambiar] = useState(""), [pendiente, iniciar] = useTransition(); const router = useRouter();
  function ajustar(productoId: string, sedeId: string, diferencia: number) {
    iniciar(async () => { const datos = new FormData(); datos.set("productoId", productoId); datos.set("sedeId", sedeId); datos.set("diferencia", String(diferencia));
      try { const resultado = await ajustarStock(datos); if (resultado.ok) { toast.success(resultado.mensaje); router.refresh(); } else toast.error(resultado.mensaje); } catch { toast.error("No pudimos ajustar la cantidad."); }
    });
  }
  const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visibles = productos.filter((p) => normalizar(`${p.nombre} ${p.sku ?? ""}`).includes(normalizar(buscar)));
  return <><div className="herramientas-modulo"><label className="buscador-panel"><Search /><input aria-label="Buscar productos" placeholder="Buscar productos" value={buscar} onChange={(e) => cambiar(e.target.value)} /></label><EditorTablaInventario columnas={columnas} libres={libres} variosLocales={sedes.length > 1} /></div>
    <div className="tabla-abierta inventario-tabla"><table><thead><tr>{columnas.map((c) => <th key={c} scope="col">{nombresColumnas[c] ?? libres.find((l) => l.id === c)?.nombre}</th>)}</tr></thead><tbody>
      {visibles.flatMap((p) => sedes.map((s) => { const cantidad = p.existencias.find((e) => e.sedeId === s.id)?.cantidad ?? 0; return <tr key={`${p.id}:${s.id}`}>
        {columnas.map((c) => <td key={c}>{c === "nombre" ? <strong>{p.nombre}</strong> : c === "precio" ? dinero(p.precio) : c === "costo" ? dinero(p.costo) : c === "sku" ? p.sku || "Sin dato" : c === "local" ? s.nombre : c === "cantidad" ? <div className="cantidad-inventario"><span>{cantidad}</span><button className="accion-icono" type="button" disabled={pendiente || cantidad === 0} aria-label={`Quitar una unidad de ${p.nombre} en ${s.nombre}`} onClick={() => ajustar(p.id, s.id, -1)}><Minus /></button><button className="accion-icono" type="button" disabled={pendiente} aria-label={`Agregar una unidad de ${p.nombre} en ${s.nombre}`} onClick={() => ajustar(p.id, s.id, 1)}><Plus /></button></div> : c === "acciones" ? <div className="acciones-tabla">
          <details className="desplegable-accion"><summary className="accion-icono" aria-label={`Editar ${p.nombre}`}><Edit3 /></summary><FormularioProducto producto={p} sedes={sedes} columnas={columnas} libres={libres} /></details>
          <details className="desplegable-accion"><summary className="boton boton--secundario">Ajustar</summary><FormularioAccion accion={ajustarStock} texto="Actualizar cantidad"><h2>Ajustar cantidad</h2><input name="productoId" type="hidden" value={p.id} /><input name="sedeId" type="hidden" value={s.id} /><label>Cantidad a agregar o quitar<input name="diferencia" type="number" step={1} required placeholder="Por ejemplo, 20 o −20" /></label><label>Motivo (opcional)<input name="motivo" maxLength={200} /></label></FormularioAccion></details>
          <BotonEliminar id={p.id} nombre={p.nombre} accion={eliminarProducto} advertencia={`Se quitarán sus unidades: ${sedes.map((local) => `${local.nombre}: ${p.existencias.find((e) => e.sedeId === local.id)?.cantidad ?? 0}`).join("; ")}. Se registrará un ajuste final por local.`} />
        </div> : String(p.valoresPersonalizados.find((v) => v.columnaId === c)?.valor ?? "Sin dato")}</td>)}
      </tr>; }))}
    </tbody></table></div>{!visibles.length && <p className="sin-resultados">{buscar ? "No encontramos productos con esa búsqueda." : "Tu inventario está vacío. Agregá tu primer producto."}</p>}
  </>;
}
