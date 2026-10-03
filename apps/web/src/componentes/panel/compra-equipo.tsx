/** Recibe varios productos existentes sin conceder edición del catálogo. */
"use client";
import { useState } from "react";
import { FormularioAccion } from "./formulario-accion";
import { registrarCompraExistente } from "@/app/panel/actividad/acciones";
type Item = { productoId: string; cantidad: number; costo: string };
export function CompraEquipo({
  sedes,
  productos,
}: {
  sedes: Array<{ id: string; nombre: string }>;
  productos: Array<{ id: string; nombre: string }>;
}) {
  const inicial = (): Item => ({
    productoId: productos[0]?.id ?? "",
    cantidad: 1,
    costo: "",
  });
  const [items, setItems] = useState<Item[]>([inicial()]),
    [proveedor, setProveedor] = useState("");
  function cambiar(i: number, campo: keyof Item, valor: string) {
    setItems((actual) =>
      actual.map((item, n) =>
        n === i
          ? { ...item, [campo]: campo === "cantidad" ? Number(valor) : valor }
          : item,
      ),
    );
  }
  return (
    <FormularioAccion
      accion={registrarCompraExistente}
      texto="Registrar compra"
      className="formulario-apilado"
      alGuardar={() => {
        setItems([inicial()]);
        setProveedor("");
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <label>
        Local
        <select required name="sedeId">
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Proveedor
        <input
          name="proveedor"
          maxLength={160}
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
        />
      </label>
      {items.map((item, i) => (
        <fieldset key={i}>
          <legend>Producto {i + 1}</legend>
          <label>
            Producto
            <select
              required
              value={item.productoId}
              onChange={(e) => cambiar(i, "productoId", e.target.value)}
            >
              {productos.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  disabled={items.some(
                    (x, n) => n !== i && x.productoId === p.id,
                  )}
                >
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              required
              min="1"
              max="1000000"
              step="1"
              value={item.cantidad}
              onChange={(e) => cambiar(i, "cantidad", e.target.value)}
            />
          </label>
          <label>
            Costo por unidad
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={item.costo}
              onChange={(e) => cambiar(i, "costo", e.target.value)}
            />
          </label>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setItems((actual) => actual.filter((_, n) => n !== i))
              }
            >
              Quitar producto
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={items.length >= 100 || items.length >= productos.length}
        onClick={() => {
          const p = productos.find(
            (p) => !items.some((i) => i.productoId === p.id),
          );
          if (p)
            setItems((actual) => [
              ...actual,
              { productoId: p.id, cantidad: 1, costo: "" },
            ]);
        }}
      >
        Agregar otro producto
      </button>
      <small>
        Confirmá sólo compras recibidas: se actualizan stock, egreso y actividad
        juntos.
      </small>
    </FormularioAccion>
  );
}
