/** Filtra productos y reúne edición, visibilidad y ajustes de stock por sede. */
"use client";

import { useState } from "react";
import { Edit3, Eye, EyeOff, PackagePlus, Search } from "lucide-react";
import {
  ajustarStock,
  actualizarProducto,
  alternarProducto,
} from "@/app/panel/inventario/acciones";

type Producto = {
  id: string;
  nombre: string;
  sku: string | null;
  precio: number;
  costo: number;
  activo: boolean;
  existencias: Array<{
    sedeId: string;
    cantidad: number;
    minimo: number;
    sede: { nombre: string };
  }>;
};
type Sede = { id: string; nombre: string };

export function TablaInventario({
  productos,
  sedes,
}: {
  productos: Producto[];
  sedes: Sede[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = productos.filter((producto) =>
    `${producto.nombre} ${producto.sku ?? ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  return (
    <>
      <label className="buscador-panel">
        <Search />
        <input
          type="search"
          placeholder="Buscar por producto o SKU"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
      </label>
      <div className="tabla-panel">
        <div className="tabla-panel__cabecera tabla-inventario">
          <span>Producto</span>
          <span>SKU</span>
          <span>Precio</span>
          <span>Stock</span>
          <span>Acciones</span>
        </div>
        {filtrados.map((producto) => {
          const stock = producto.existencias.reduce(
            (total, item) => total + item.cantidad,
            0,
          );
          const minimo = producto.existencias.reduce(
            (total, item) => total + item.minimo,
            0,
          );
          return (
            <div
              className={`tabla-panel__fila tabla-inventario ${producto.activo ? "" : "fila-inactiva"}`}
              key={producto.id}
            >
              <strong>{producto.nombre}</strong>
              <span>{producto.sku || "Sin dato"}</span>
              <span>{pesos(producto.precio)}</span>
              <span>
                <b className={stock <= minimo ? "stock-bajo" : "stock-bien"}>
                  {stock} unidades
                </b>
              </span>
              <div className="acciones-tabla">
                <details className="desplegable-accion">
                  <summary
                    className="accion-icono"
                    aria-label={`Editar ${producto.nombre}`}
                  >
                    <Edit3 />
                  </summary>
                  <form
                    action={actualizarProducto}
                    className="formulario-flotante"
                  >
                    <h2>Editar producto</h2>
                    <input type="hidden" name="id" value={producto.id} />
                    <label>
                      Nombre
                      <input
                        name="nombre"
                        required
                        defaultValue={producto.nombre}
                      />
                    </label>
                    <label>
                      SKU
                      <input name="sku" defaultValue={producto.sku ?? ""} />
                    </label>
                    <div className="form-grid">
                      <label>
                        Precio
                        <input
                          name="precio"
                          type="number"
                          min="0"
                          defaultValue={producto.precio}
                          required
                        />
                      </label>
                      <label>
                        Costo
                        <input
                          name="costo"
                          type="number"
                          min="0"
                          defaultValue={producto.costo}
                        />
                      </label>
                    </div>
                    <button className="boton boton--primario">
                      Guardar cambios
                    </button>
                  </form>
                </details>
                <details className="desplegable-accion">
                  <summary
                    className="accion-icono"
                    aria-label={`Ajustar stock de ${producto.nombre}`}
                  >
                    <PackagePlus />
                  </summary>
                  <form action={ajustarStock} className="formulario-flotante">
                    <h2>Ajustar stock</h2>
                    <input
                      type="hidden"
                      name="productoId"
                      value={producto.id}
                    />
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
                    <label>
                      Cantidad a sumar o quitar
                      <input
                        name="diferencia"
                        type="number"
                        step="1"
                        required
                        placeholder="Ejemplo: 5 o -2"
                      />
                    </label>
                    <label>
                      Motivo
                      <input
                        name="motivo"
                        placeholder="Compra, rotura, corrección..."
                      />
                    </label>
                    <button className="boton boton--primario">
                      Aplicar ajuste
                    </button>
                  </form>
                </details>
                <form action={alternarProducto}>
                  <input type="hidden" name="id" value={producto.id} />
                  <button
                    className="accion-icono"
                    aria-label={
                      producto.activo
                        ? `Archivar ${producto.nombre}`
                        : `Activar ${producto.nombre}`
                    }
                  >
                    {producto.activo ? <EyeOff /> : <Eye />}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {!filtrados.length && (
          <p className="sin-resultados">No hay productos que coincidan.</p>
        )}
      </div>
    </>
  );
}

function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
