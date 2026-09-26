/** Muestra una tabla abierta con búsqueda, cantidades por local y ajustes seguros. */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  ajustarStock,
  eliminarProducto,
} from "@/app/panel/inventario/acciones";
import { nombresColumnas, type ColumnaLibre } from "@/lib/columnas-inventario";
import {
  FormularioProducto,
  type ProductoEditable,
} from "./formulario-producto";
import { BotonEliminar } from "./boton-eliminar";
import { EditorTablaInventario } from "./editor-tabla-inventario";
import { ControlFiltroLocal } from "./filtro-local";

const dinero = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
const claveStock = (productoId: string, sedeId: string) =>
  `${productoId}:${sedeId}`;
const columnaCentrada = (columna: string) => {
  if (columna === "precio")
    return "inventario-columna--centrada inventario-columna--precio";
  return ["cantidad", "local"].includes(columna)
    ? "inventario-columna--centrada"
    : undefined;
};

type Producto = ProductoEditable & {
  existencias: Array<{
    sedeId: string;
    cantidad: number;
    sede: { nombre: string };
  }>;
};

export function TablaInventario({
  productos,
  sedes,
  columnas,
  libres,
  nuevoProducto,
}: {
  productos: Producto[];
  sedes: Array<{ id: string; nombre: string }>;
  columnas: string[];
  libres: ColumnaLibre[];
  nuevoProducto: ReactNode;
}) {
  const [buscar, cambiar] = useState("");
  const [local, cambiarLocal] = useState("");
  const [pendientes, cambiarPendientes] = useState<Record<string, number>>({});
  const pendientesRef = useRef<Record<string, number>>({});
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );
  useEffect(() => {
    if (local && !sedes.some((sede) => sede.id === local)) {
      cambiarLocal("");
    }
  }, [local, sedes]);

  async function enviarPendientes() {
    const lote = pendientesRef.current;
    if (!Object.keys(lote).length) return;
    pendientesRef.current = {};
    cambiarPendientes({});
    const resultados = await Promise.all(
      Object.entries(lote).map(async ([clave, diferencia]) => {
        const [productoId, sedeId] = clave.split(":");
        const datos = new FormData();
        datos.set("productoId", productoId ?? "");
        datos.set("sedeId", sedeId ?? "");
        datos.set("diferencia", String(diferencia));
        try {
          return { clave, diferencia, resultado: await ajustarStock(datos) };
        } catch {
          return {
            clave,
            diferencia,
            resultado: {
              ok: false,
              mensaje: "No pudimos ajustar la cantidad.",
            },
          };
        }
      }),
    );
    const fallidos = resultados.filter(({ resultado }) => !resultado.ok);
    if (fallidos.length) {
      const restaurados = { ...pendientesRef.current };
      for (const { clave, diferencia } of fallidos)
        restaurados[clave] = (restaurados[clave] ?? 0) + diferencia;
      pendientesRef.current = restaurados;
      cambiarPendientes(restaurados);
      toast.error(
        fallidos[0]?.resultado.mensaje ?? "No pudimos ajustar la cantidad.",
      );
      router.refresh();
      if (Object.keys(restaurados).length) programarEnvio();
      return;
    }
    toast.success("Cantidades actualizadas.");
    router.refresh();
  }

  function programarEnvio() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      void enviarPendientes();
    }, 450);
  }

  function ajustar(
    productoId: string,
    sedeId: string,
    diferencia: number,
    cantidadBase: number,
  ) {
    const clave = claveStock(productoId, sedeId);
    const actual = pendientesRef.current[clave] ?? 0;
    if (diferencia < 0 && cantidadBase + actual <= 0) return;
    const siguientes = {
      ...pendientesRef.current,
      [clave]: actual + diferencia,
    };
    if (!siguientes[clave]) delete siguientes[clave];
    pendientesRef.current = siguientes;
    cambiarPendientes(siguientes);
    programarEnvio();
  }

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const visibles = productos.filter((p) =>
    normalizar(`${p.nombre} ${p.sku ?? ""}`).includes(normalizar(buscar)),
  );
  const sedesVisibles = local
    ? sedes.filter((sede) => sede.id === local)
    : sedes;

  return (
    <>
      <header className="cabecera-seccion inventario-cabecera">
        <h1>Inventario</h1>
        <div className="acciones-seccion inventario-cabecera__acciones">
          {sedes.length > 1 && (
            <ControlFiltroLocal
              className="filtro-discreto"
              ariaLabel="Filtrar inventario por local"
              sedes={sedes}
              valor={local}
              onChange={cambiarLocal}
            />
          )}
          <EditorTablaInventario
            columnas={columnas}
            libres={libres}
            variosLocales={sedes.length > 1}
          />
          {nuevoProducto}
        </div>
      </header>
      <div className="herramientas-modulo inventario-buscador">
        <label className="buscador-panel">
          <Search />
          <input
            aria-label="Buscar productos"
            placeholder="Buscar productos"
            value={buscar}
            onChange={(e) => cambiar(e.target.value)}
          />
        </label>
      </div>
      <div className="tabla-abierta inventario-tabla">
        <table>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th className={columnaCentrada(c)} key={c} scope="col">
                  {nombresColumnas[c] ?? libres.find((l) => l.id === c)?.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.flatMap((p) =>
              sedesVisibles.map((s) => {
                const cantidad =
                  p.existencias.find((e) => e.sedeId === s.id)?.cantidad ?? 0;
                const clave = claveStock(p.id, s.id);
                const cantidadVisible = Math.max(
                  0,
                  cantidad + (pendientes[clave] ?? 0),
                );
                return (
                  <tr key={clave}>
                    {columnas.map((c) => (
                      <td className={columnaCentrada(c)} key={c}>
                        {c === "nombre" ? (
                          <strong>{p.nombre}</strong>
                        ) : c === "precio" ? (
                          dinero(p.precio)
                        ) : c === "costo" ? (
                          dinero(p.costo)
                        ) : c === "sku" ? (
                          p.sku || "Sin dato"
                        ) : c === "local" ? (
                          s.nombre
                        ) : c === "cantidad" ? (
                          <div className="cantidad-inventario">
                            <button
                              className="accion-icono cantidad-inventario__boton"
                              type="button"
                              disabled={cantidadVisible === 0}
                              aria-label={`Quitar una unidad de ${p.nombre} en ${s.nombre}`}
                              onClick={() => ajustar(p.id, s.id, -1, cantidad)}
                            >
                              <Minus />
                            </button>
                            <span aria-live="polite">{cantidadVisible}</span>
                            <button
                              className="accion-icono cantidad-inventario__boton"
                              type="button"
                              aria-label={`Agregar una unidad de ${p.nombre} en ${s.nombre}`}
                              onClick={() => ajustar(p.id, s.id, 1, cantidad)}
                            >
                              <Plus />
                            </button>
                          </div>
                        ) : c === "acciones" ? (
                          <div className="acciones-tabla">
                            <details className="desplegable-accion">
                              <summary
                                className="accion-icono accion-icono--editar"
                                aria-label={`Editar ${p.nombre}`}
                                title={`Editar ${p.nombre}`}
                              >
                                <Edit3 aria-hidden="true" />
                              </summary>
                              <FormularioProducto
                                producto={p}
                                sedes={sedes}
                                columnas={columnas}
                                libres={libres}
                              />
                            </details>
                            <BotonEliminar
                              id={p.id}
                              nombre={p.nombre}
                              accion={eliminarProducto}
                              advertencia={`Se quitarán sus unidades: ${sedes.map((local) => `${local.nombre}: ${p.existencias.find((e) => e.sedeId === local.id)?.cantidad ?? 0}`).join("; ")}. Se registrará un ajuste final por local.`}
                            />
                          </div>
                        ) : (
                          String(
                            p.valoresPersonalizados.find(
                              (v) => v.columnaId === c,
                            )?.valor ?? "Sin dato",
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
      {!visibles.length && (
        <p className="sin-resultados">
          {buscar
            ? "No encontramos productos con esa búsqueda."
            : "Tu inventario está vacío. Agregá tu primer producto."}
        </p>
      )}
    </>
  );
}
