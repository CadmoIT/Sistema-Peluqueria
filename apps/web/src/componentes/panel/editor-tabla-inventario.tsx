/** Permite elegir, ordenar y eliminar columnas, confirmando el borrado de sus valores. */
"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Settings2, Trash2 } from "lucide-react";
import { nombresColumnas, type ColumnaLibre } from "@/lib/columnas-inventario";
import {
  guardarColumnas,
  guardarColumnaLibre,
  eliminarColumnaLibre,
} from "@/app/panel/inventario/acciones";
import { DialogoPanel } from "./dialogo-panel";
import { FormularioAccion } from "./formulario-accion";

const columnasObligatorias = new Set(["nombre", "cantidad", "acciones"]);

export function EditorTablaInventario({
  columnas,
  libres,
  variosLocales,
}: {
  columnas: string[];
  libres: ColumnaLibre[];
  variosLocales: boolean;
}) {
  const [abierto, abrir] = useState(false);
  const [orden, ordenar] = useState(columnas);
  const [arrastrando, arrastrar] = useState<string | null>(null);
  const [eliminando, eliminar] = useState<ColumnaLibre | null>(null);
  const libresConocidas = useRef(new Set(libres.map((columna) => columna.id)));

  useEffect(() => {
    const disponibles = [
      ...Object.keys(nombresColumnas).filter(
        (id) => id !== "local" || variosLocales,
      ),
      ...libres.map((columna) => columna.id),
    ];
    const nuevos = libres
      .map((columna) => columna.id)
      .filter((id) => !libresConocidas.current.has(id));
    libresConocidas.current = new Set(libres.map((columna) => columna.id));
    ordenar((actual) => {
      const validas = actual.filter((id) => disponibles.includes(id));
      return nuevos.length || validas.length !== actual.length
        ? [...validas, ...nuevos]
        : actual;
    });
  }, [libres, variosLocales]);

  const nombreColumna = (id: string) =>
    nombresColumnas[id] ?? libres.find((columna) => columna.id === id)?.nombre;

  function mover(origen: string, destino: string) {
    const desde = orden.indexOf(origen);
    const hasta = orden.indexOf(destino);
    if (desde < 0 || hasta < 0 || desde === hasta) return;
    const siguiente = [...orden];
    const [movida] = siguiente.splice(desde, 1);
    if (movida) siguiente.splice(hasta, 0, movida);
    ordenar(siguiente);
  }

  function soltar(destino: string) {
    if (arrastrando) mover(arrastrando, destino);
    arrastrar(null);
  }

  function quitar(id: string) {
    const libre = libres.find((columna) => columna.id === id);
    if (libre) eliminar(libre);
    else ordenar((actual) => actual.filter((columna) => columna !== id));
  }

  return (
    <>
      <button
        className="boton boton--secundario"
        type="button"
        onClick={() => {
          ordenar(columnas);
          abrir(true);
        }}
      >
        <Settings2 /> Editar tabla
      </button>
      {abierto && (
        <DialogoPanel titulo="Editar tabla" cerrar={() => abrir(false)}>
          <p>
            Arrastrá una columna para cambiar su posición. Las columnas
            obligatorias no se pueden quitar.
          </p>
          <FormularioAccion
            accion={guardarColumnas}
            texto="Guardar tabla"
            className="formulario-dialogo editor-columnas-formulario"
            alGuardar={() => abrir(false)}
          >
            {orden.map((id) => {
              const puedeQuitar = !columnasObligatorias.has(id);
              return (
                <div
                  className={`columnas-fila${arrastrando === id ? " arrastrando" : ""}`}
                  key={id}
                  draggable
                  onDragStart={(evento) => {
                    arrastrar(id);
                    evento.dataTransfer.effectAllowed = "move";
                    evento.dataTransfer.setData("text/plain", id);
                  }}
                  onDragOver={(evento) => {
                    evento.preventDefault();
                    evento.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(evento) => {
                    evento.preventDefault();
                    soltar(id);
                  }}
                  onDragEnd={() => arrastrar(null)}
                  onKeyDown={(evento) => {
                    if (
                      !evento.altKey ||
                      !["ArrowUp", "ArrowDown"].includes(evento.key)
                    )
                      return;
                    evento.preventDefault();
                    const indice = orden.indexOf(id);
                    const siguiente =
                      evento.key === "ArrowUp" ? indice - 1 : indice + 1;
                    if (siguiente < 0 || siguiente >= orden.length) return;
                    const reordenadas = [...orden];
                    [reordenadas[indice], reordenadas[siguiente]] = [
                      reordenadas[siguiente]!,
                      reordenadas[indice]!,
                    ];
                    ordenar(reordenadas);
                  }}
                  tabIndex={0}
                  aria-grabbed={arrastrando === id}
                  aria-label={`Columna ${nombreColumna(id)}. Usá Alt más las flechas para moverla.`}
                >
                  <GripVertical
                    className="columnas-fila__arrastre"
                    aria-hidden="true"
                  />
                  <input name="columnas" type="hidden" value={id} />
                  <span>{nombreColumna(id)}</span>
                  {puedeQuitar ? (
                    <button
                      className="accion-icono accion-icono--eliminar columnas-fila__borrar"
                      type="button"
                      draggable={false}
                      aria-label={`Quitar columna ${nombreColumna(id)}`}
                      title={`Quitar columna ${nombreColumna(id)}`}
                      onClick={() => quitar(id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="columnas-fila__obligatoria">
                      Obligatoria
                    </span>
                  )}
                </div>
              );
            })}
          </FormularioAccion>
          <h3>Nueva columna</h3>
          <FormularioAccion
            accion={guardarColumnaLibre}
            texto="Agregar columna"
            className="formulario-dialogo"
          >
            <label>
              Nombre
              <input
                name="nombre"
                required
                maxLength={60}
                placeholder="Por ejemplo, Fecha de vencimiento"
              />
            </label>
            <label>
              Tipo
              <select name="tipo">
                <option value="TEXTO">Texto</option>
                <option value="NUMERO">Número</option>
                <option value="FECHA">Fecha</option>
              </select>
            </label>
          </FormularioAccion>
        </DialogoPanel>
      )}
      {eliminando && (
        <DialogoPanel
          titulo={`¿Eliminar ${eliminando.nombre}?`}
          cerrar={() => eliminar(null)}
        >
          <p>
            Se eliminará esta columna y todos sus valores en todos los
            productos. No se puede deshacer.
          </p>
          <FormularioAccion
            accion={eliminarColumnaLibre}
            texto="Eliminar columna y valores"
            className="formulario-dialogo"
            alGuardar={() => eliminar(null)}
          >
            <input name="id" type="hidden" value={eliminando.id} />
          </FormularioAccion>
        </DialogoPanel>
      )}
    </>
  );
}
