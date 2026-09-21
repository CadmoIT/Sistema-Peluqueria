/** Centraliza compras de productos y las incorpora al inventario del local elegido. */
import { Download, Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { ImportadorCompras } from "@/componentes/panel/importador-compras";
import { obtenerCompras } from "@/servicios/panel-datos.service";
import { registrarCompra } from "./acciones";
import { TablaCompras } from "@/componentes/panel/tabla-compras";
import { resolverColumnasCompras } from "@/lib/columnas-compras";
import "./compras.css";

export const metadata = { title: "Compras" };

export default async function PaginaCompras() {
  const datos = await obtenerCompras();
  const locales = datos.sedes.map(({ id, nombre }) => ({ id, nombre }));
  const columnas = resolverColumnasCompras(datos.negocio.configuracion, locales.length > 1);
  return (
    <div className="panel-contenido compras-contenido">
      <VistaPanelLista ruta="/panel/compras" />
      <header className="cabecera-seccion">
        <div>
          <h1>Compras</h1>
          <p>Cargá productos de tus vendedores y sumalos al inventario.</p>
        </div>
        <div className="compras-acciones">
          <details className="desplegable-accion compras-exportar">
            <summary className="boton boton--secundario"><Download /> Exportar</summary>
            <div className="popover-panel">
              <a href="/api/v1/compras/exportar?formato=xlsx">Excel (.xlsx)</a>
              <a href="/api/v1/compras/exportar?formato=csv">CSV</a>
            </div>
          </details>
          <ImportadorCompras sedes={locales} />
          <details className="desplegable-accion">
            <summary className="boton boton--primario"><Plus /> Agregar compra</summary>
            <FormularioAccion accion={registrarCompra} texto="Registrar compra" className="formulario-flotante formulario-compra">
              <h2>Nueva compra</h2>
              <label>Proveedor<input name="proveedor" maxLength={160} placeholder="Opcional" /></label>
              {locales.length === 1 ? <input type="hidden" name="sedeId" value={locales[0]!.id} /> : <label>Local<select name="sedeId" required defaultValue=""> <option value="" disabled>Elegí un local</option>{locales.map((sede) => <option value={sede.id} key={sede.id}>{sede.nombre}</option>)}</select></label>}
              <ManualCompra productos={datos.productos.map((producto) => ({ id: producto.id, nombre: producto.nombre }))} />
            </FormularioAccion>
          </details>
        </div>
      </header>
      <TablaCompras compras={datos.compras.map((compra) => ({ id: compra.id, creadoEn: compra.creadoEn.toISOString(), proveedor: compra.proveedor, sedeId: compra.sedeId, sedeNombre: compra.sede.nombre, items: compra.items, total: Number(compra.total) }))} sedes={locales} columnas={columnas} />
    </div>
  );
}

function ManualCompra({ productos }: { productos: Array<{ id: string; nombre: string }> }) {
  return <div className="compra-manual">
    <label>Producto existente<select name="productoId" defaultValue=""><option value="">Nuevo producto</option>{productos.map((producto) => <option value={producto.id} key={producto.id}>{producto.nombre}</option>)}</select></label>
    <label>Nombre del producto<input name="nombre" maxLength={200} placeholder="Sólo para un producto nuevo" /></label>
    <div className="form-grid"><label>Cantidad<input name="cantidad" type="number" min={1} max={1000000} step={1} defaultValue={1} required /></label><label>Costo unitario<input name="costo" type="number" min={0.01} step="0.01" required /></label></div>
    <label>Precio de venta<input name="precio" type="number" min={0} step="0.01" placeholder="Opcional" /></label>
    <input type="hidden" name="items" value="[]" />
    <p className="ayuda-compras">Para productos existentes se conserva el nombre y se actualiza su costo, precio y stock.</p>
  </div>;
}
