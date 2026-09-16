/** Arma un carrito, confirma el cambio de local y atribuye toda la compra a una sola opción. */
"use client";
import { useRef, useState } from "react";
import { Minus, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { registrarVenta } from "@/app/panel/caja/acciones";
import { DialogoPanel } from "./dialogo-panel";
import { FormularioAccion } from "./formulario-accion";
type Articulo = { id: string; tipo: "producto" | "servicio"; nombre: string; precio: number; stockPorSede?: Record<string, number>; sedesIds?: string[] };
type Opcion = { id: string; nombre: string };
const pesos = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
export function PuntoVenta({ articulos, sedes, profesionales }: { articulos: Articulo[]; sedes: Opcion[]; profesionales: Opcion[] }) {
  const [cantidades, poner] = useState<Record<string, number>>({}), [buscar, buscarPor] = useState(""), [sedeId, seleccionar] = useState(sedes[0]?.id ?? ""), [abierto, abrir] = useState(false), [cambioLocal, confirmarCambio] = useState("");
  const idempotencia = useRef("");
  const clave = (a: Articulo) => `${a.tipo}:${a.id}`;
  const disponibles = articulos.filter((a) => !a.sedesIds?.length || a.sedesIds.includes(sedeId));
  const seleccionados = disponibles.filter((a) => (cantidades[clave(a)] ?? 0) > 0);
  const items = seleccionados.map((a) => ({ id: a.id, tipo: a.tipo, cantidad: cantidades[clave(a)]! }));
  const total = seleccionados.reduce((s, a) => s + a.precio * cantidades[clave(a)]!, 0), unidades = items.reduce((s, a) => s + a.cantidad, 0);
  const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visibles = disponibles.filter((a) => normalizar(a.nombre).includes(normalizar(buscar)));
  function cambiar(a: Articulo, delta: number) { poner((actual) => ({ ...actual, [clave(a)]: Math.max(0, Math.min(a.tipo === "producto" ? Math.min(100, a.stockPorSede?.[sedeId] ?? 0) : 100, (actual[clave(a)] ?? 0) + delta)) })); }
  function abrirCarrito() { if (!idempotencia.current) idempotencia.current = crypto.randomUUID(); abrir(true); }
  function cambiarLocal(id: string) { if (seleccionados.length) confirmarCambio(id); else { seleccionar(id); idempotencia.current = ""; } }
  function controles(a: Articulo) { const cantidad = cantidades[clave(a)] ?? 0; return <div className="cantidad-venta"><button type="button" onClick={() => cambiar(a, -1)} disabled={!cantidad} aria-label={`Quitar ${a.nombre}`}><Minus /></button><b>{cantidad}</b><button type="button" onClick={() => cambiar(a, 1)} disabled={cantidad >= (a.tipo === "producto" ? Math.min(100, a.stockPorSede?.[sedeId] ?? 0) : 100)} aria-label={`Agregar ${a.nombre}`}><Plus /></button></div>; }
  return <section className="punto-venta caja-venta"><div className="caja-barra"><h2>Venta rápida</h2><div className="caja-barra__acciones">{sedes.length > 1 && <label className="filtro-discreto">Local<select aria-label="Local de la venta" value={sedeId} onChange={(e) => cambiarLocal(e.target.value)}>{sedes.map((s) => <option value={s.id} key={s.id}>{s.nombre}</option>)}</select></label>}<button className="boton boton--secundario" type="button" onClick={abrirCarrito}><ShoppingBasket />Carrito ({unidades})</button></div></div>
    <label className="buscador-panel"><Search /><input type="search" aria-label="Buscar productos o servicios" placeholder="Buscar productos o servicios" value={buscar} onChange={(e) => buscarPor(e.target.value)} /></label>
    <div className="punto-venta__articulos">{visibles.map((a) => <article key={clave(a)}><div><small>{a.tipo === "producto" ? "Producto" : "Servicio"}</small><strong>{a.nombre}</strong><span>{pesos(a.precio)}</span></div>{controles(a)}</article>)}</div>
    {!visibles.length && <p className="sin-resultados">No hay artículos para mostrar.</p>}
    {abierto && <DialogoPanel titulo="Carrito" cerrar={() => abrir(false)}>{seleccionados.length ? <>
      <div className="carrito-articulos">{seleccionados.map((a) => <div className="carrito-articulo" key={clave(a)}><div><strong>{a.nombre}</strong><span>{pesos(a.precio * cantidades[clave(a)]!)}</span></div>{controles(a)}<button className="accion-icono accion-eliminar" aria-label={`Quitar del carrito ${a.nombre}`} onClick={() => poner((actual) => ({ ...actual, [clave(a)]: 0 }))}><Trash2 /></button></div>)}</div>
      <div className="carrito-total"><span>Total</span><strong>{pesos(total)}</strong></div>
      <FormularioAccion accion={registrarVenta} className="formulario-dialogo" texto="Confirmar compra" alGuardar={() => { poner({}); abrir(false); idempotencia.current = ""; }}>
        <input type="hidden" name="items" value={JSON.stringify(items)} /><input type="hidden" name="sedeId" value={sedeId} /><input type="hidden" name="idempotencia" value={idempotencia.current} />
        {profesionales.length ? <label>Atribuir toda la compra a<select name="atribucion" required defaultValue=""><option value="" disabled>Elegí Local o una persona</option><option value="local">Local</option>{profesionales.map((p) => <option value={p.id} key={p.id}>{p.nombre}</option>)}</select></label> : <input type="hidden" name="atribucion" value="local" />}
      </FormularioAccion>
    </> : <p>Todavía no agregaste artículos al carrito.</p>}</DialogoPanel>}
    {cambioLocal && <DialogoPanel titulo="¿Cambiar de local?" cerrar={() => confirmarCambio("")}><p>El carrito tiene artículos seleccionados. Para cambiar de local hay que vaciarlo.</p><button type="button" className="boton boton--primario" onClick={() => { poner({}); seleccionar(cambioLocal); confirmarCambio(""); idempotencia.current = ""; }}>Vaciar carrito y cambiar</button></DialogoPanel>}
  </section>;
}
