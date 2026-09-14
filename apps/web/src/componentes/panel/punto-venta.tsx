/** Permite armar una venta rápida de productos y servicios antes de confirmarla. */
"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { registrarVenta } from "@/app/panel/caja/acciones";

type Articulo = {
  id: string;
  tipo: "producto" | "servicio";
  nombre: string;
  precio: number;
  stockPorSede?: Record<string, number>;
};
type Sede = { id: string; nombre: string };

export function PuntoVenta({
  articulos,
  sedes,
}: {
  articulos: Articulo[];
  sedes: Sede[];
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [sedeId, setSedeId] = useState(sedes[0]?.id ?? "");
  const visibles = articulos.filter((articulo) =>
    articulo.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const items = articulos.flatMap((articulo) => {
    const cantidad = cantidades[`${articulo.tipo}:${articulo.id}`] ?? 0;
    return cantidad ? [{ id: articulo.id, tipo: articulo.tipo, cantidad }] : [];
  });
  const total = useMemo(
    () =>
      articulos.reduce(
        (suma, articulo) =>
          suma +
          articulo.precio *
            (cantidades[`${articulo.tipo}:${articulo.id}`] ?? 0),
        0,
      ),
    [articulos, cantidades],
  );

  function cambiar(articulo: Articulo, diferencia: number) {
    const clave = `${articulo.tipo}:${articulo.id}`;
    setCantidades((actual) => {
      const maximo = articulo.tipo === "producto" ? stock(articulo) : 100;
      return {
        ...actual,
        [clave]: Math.max(
          0,
          Math.min(maximo, (actual[clave] ?? 0) + diferencia),
        ),
      };
    });
  }

  function stock(articulo: Articulo) {
    return articulo.stockPorSede?.[sedeId] ?? 0;
  }

  return (
    <section className="modulo punto-venta">
      <div className="modulo__titulo">
        <div>
          <h2>Venta rápida</h2>
          <p>Elegí productos o servicios y confirmá una sola cuenta.</p>
        </div>
      </div>
      <input
        type="search"
        placeholder="Buscar productos o servicios"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
      />
      <div className="punto-venta__articulos">
        {visibles.map((articulo) => {
          const cantidad = cantidades[`${articulo.tipo}:${articulo.id}`] ?? 0;
          return (
            <article key={`${articulo.tipo}:${articulo.id}`}>
              <div>
                <small>
                  {articulo.tipo === "producto" ? "Producto" : "Servicio"}
                </small>
                <strong>{articulo.nombre}</strong>
                <span>{pesos(articulo.precio)}</span>
                {articulo.stockPorSede !== undefined && (
                  <em>{stock(articulo)} disponibles en esta sede</em>
                )}
              </div>
              <div className="cantidad-venta">
                <button
                  type="button"
                  onClick={() => cambiar(articulo, -1)}
                  aria-label={`Quitar ${articulo.nombre}`}
                >
                  <Minus />
                </button>
                <b>{cantidad}</b>
                <button
                  type="button"
                  onClick={() => cambiar(articulo, 1)}
                  disabled={
                    articulo.tipo === "producto" && cantidad >= stock(articulo)
                  }
                  aria-label={`Agregar ${articulo.nombre}`}
                >
                  <Plus />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <form action={registrarVenta} className="punto-venta__confirmar">
        <input type="hidden" name="items" value={JSON.stringify(items)} />
        {sedes.length === 1 ? (
          <input type="hidden" name="sedeId" value={sedeId} />
        ) : (
          <label>
            Local
            <select
              name="sedeId"
              required
              value={sedeId}
              onChange={(evento) => {
                setSedeId(evento.target.value);
                setCantidades({});
              }}
            >
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <div>
          <span>Total</span>
          <strong>{pesos(total)}</strong>
        </div>
        <button className="boton boton--primario" disabled={!items.length}>
          <ShoppingBasket /> Confirmar venta
        </button>
      </form>
    </section>
  );
}

function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
