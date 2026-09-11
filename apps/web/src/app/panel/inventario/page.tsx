/** Presenta el inventario por sede y permite cargar nuevos productos. */
import { Package, Plus } from "lucide-react";
import { crearProducto } from "./acciones";
import { TablaInventario } from "@/componentes/panel/tabla-inventario";
import { obtenerInventario } from "@/servicios/panel-datos.service";

export const metadata = { title: "Inventario" };
export default async function PaginaInventario() {
  const { productos, sedes } = await obtenerInventario();
  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Inventario</h1>
          <p>Control simple del stock disponible en cada local.</p>
        </div>
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Nuevo producto
          </summary>
          <form action={crearProducto} className="formulario-flotante">
            <h2>Nuevo producto</h2>
            <label>
              Nombre
              <input name="nombre" required />
            </label>
            <div className="form-grid">
              <label>
                SKU
                <input name="sku" />
              </label>
              <label>
                Precio
                <input name="precio" type="number" min="0" required />
              </label>
              <label>
                Costo
                <input name="costo" type="number" min="0" />
              </label>
              <label>
                Cantidad inicial
                <input name="cantidad" type="number" min="0" defaultValue="0" />
              </label>
              <label>
                Stock mínimo
                <input name="minimo" type="number" min="0" defaultValue="0" />
              </label>
            </div>
            <label>
              Sede
              <select name="sedeId" required>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button className="boton boton--primario">Guardar producto</button>
          </form>
        </details>
      </header>
      {productos.length ? (
        <TablaInventario
          sedes={sedes}
          productos={productos.map((producto) => ({
            ...producto,
            precio: Number(producto.precio),
            costo: Number(producto.costo ?? 0),
          }))}
        />
      ) : (
        <div className="estado-vacio grande">
          <Package />
          <strong>Tu inventario está vacío</strong>
          <p>Agregá productos para comenzar a controlar el stock.</p>
        </div>
      )}
    </div>
  );
}
