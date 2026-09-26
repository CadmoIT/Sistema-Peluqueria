/** Busca servicios en filas completas y abre detalles sin confundirlos con las acciones. */
"use client";
import { useCallback, useState } from "react";
import { Edit3, Minus, Plus, Search } from "lucide-react";
import {
  FormularioServicio,
  type ServicioEditable,
} from "./formulario-servicio";
import { DialogoPanel } from "./dialogo-panel";
import { BotonEliminar } from "./boton-eliminar";
import { eliminarServicio } from "@/app/panel/servicios/acciones";
type Opcion = { id: string; nombre: string };
type Fila = ServicioEditable & { activo: boolean };
const dinero = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
export function ListadoServicios({
  servicios,
  profesionales,
  sedes,
}: {
  servicios: Fila[];
  profesionales: Opcion[];
  sedes: Opcion[];
}) {
  const [buscar, cambiar] = useState(""),
    [detalle, abrir] = useState<Fila | null>(null),
    [edicion, editar] = useState<Fila | null>(null);
  const cerrarEdicion = useCallback(() => editar(null), []);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Set<string>>(
    () => new Set(),
  );
  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const visibles = servicios.filter((s) =>
    normalizar(`${s.nombre} ${s.categoria}`).includes(normalizar(buscar)),
  );
  const grupos = visibles.reduce<Record<string, Fila[]>>((resultado, servicio) => {
    (resultado[servicio.categoria || "General"] ??= []).push(servicio);
    return resultado;
  }, {});
  const alternarCategoria = (categoria: string) => {
    setCategoriasAbiertas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(categoria)) siguientes.delete(categoria);
      else siguientes.add(categoria);
      return siguientes;
    });
  };
  return (
    <>
      <div className="herramientas-modulo">
        <label className="buscador-panel">
          <Search />
          <input
            aria-label="Buscar servicios"
            placeholder="Buscar por nombre o categoría"
            value={buscar}
            onChange={(e) => cambiar(e.target.value)}
          />
        </label>
      </div>
      <div className="servicios-categorias">
        {Object.entries(grupos).map(([categoria, opciones], indice) => {
          const abierta = categoriasAbiertas.has(categoria);
          const idContenido = `servicios-categoria-${indice}`;
          return (
            <section
              className={`servicios-categoria${abierta ? " abierta" : ""}`}
              key={categoria}
            >
              <button
                type="button"
                className="servicios-categoria__encabezado"
                aria-expanded={abierta}
                aria-controls={idContenido}
                onClick={() => alternarCategoria(categoria)}
              >
                <span>
                  <strong>{categoria}</strong>
                </span>
                {abierta ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
              </button>
              <div
                className="servicios-categoria__contenido"
                id={idContenido}
                aria-hidden={!abierta}
              >
                <div className="servicios-categoria__interior">
                  {opciones.map((s) => (
                    <article
                      className={`servicio-fila ${s.activo ? "" : "inactivo"}`}
                      key={s.id}
                    >
                      <button
                        type="button"
                        className="servicio-fila__detalle"
                        onClick={() => abrir(s)}
                        aria-label={`Ver detalles de ${s.nombre}`}
                      >
                        <div>
                          <h2>{s.nombre}</h2>
                        </div>
                        <div>
                          <span className="servicio-fila__etiqueta">Precio</span>
                          <strong>{dinero(s.precio)}</strong>
                        </div>
                        <div>
                          <span className="servicio-fila__etiqueta">Duración</span>
                          <strong>{s.duracionMinutos} min</strong>
                        </div>
                      </button>
                      <div className="tarjeta-listado__acciones">
                        <details className="desplegable-accion">
                          <summary
                            className="accion-icono accion-icono--editar"
                            aria-label={`Editar ${s.nombre}`}
                            title={`Editar ${s.nombre}`}
                          >
                            <Edit3 aria-hidden="true" />
                          </summary>
                          <FormularioServicio
                            servicio={s}
                            profesionales={profesionales}
                            sedes={sedes}
                          />
                        </details>
                        <BotonEliminar
                          id={s.id}
                          nombre={s.nombre}
                          advertencia="Se eliminará este servicio del catálogo y de las asignaciones activas."
                          accion={eliminarServicio}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {!visibles.length && (
        <p className="sin-resultados">
          No encontramos servicios con esa búsqueda.
        </p>
      )}
      {detalle && (
        <DialogoPanel titulo={detalle.nombre} cerrar={() => abrir(null)}>
          <dl className="servicio-datos">
            <div>
              <dt>Categoría</dt>
              <dd>{detalle.categoria}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd>{dinero(detalle.precio)}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>{detalle.duracionMinutos} min</dd>
            </div>
            {profesionales.length > 1 && (
              <div className="servicio-datos__ancho">
                <dt>Profesionales</dt>
                <dd>
                  {profesionales
                    .filter((p) => detalle.profesionalIds.includes(p.id))
                    .map((p) => p.nombre)
                    .join(", ") || "Sin asignar"}
                </dd>
              </div>
            )}
            {sedes.length > 1 && (
              <div className="servicio-datos__ancho">
                <dt>Locales</dt>
                <dd>
                  {sedes
                    .filter((p) => detalle.sedeIds.includes(p.id))
                    .map((p) => p.nombre)
                    .join(", ") || "Sin asignar"}
                </dd>
              </div>
            )}
          </dl>
          <div className="acciones-seccion">
            <button
              className="accion-icono accion-icono--editar"
              type="button"
              aria-label={`Editar ${detalle.nombre}`}
              title={`Editar ${detalle.nombre}`}
              onClick={() => {
                editar(detalle);
                abrir(null);
              }}
            >
              <Edit3 aria-hidden="true" />
            </button>
            <BotonEliminar
              id={detalle.id}
              nombre={detalle.nombre}
              advertencia="Se eliminará este servicio del catálogo y de las asignaciones activas."
              accion={eliminarServicio}
            />
          </div>
        </DialogoPanel>
      )}
      {edicion && (
        <DialogoPanel
          titulo={`Editar ${edicion.nombre}`}
          cerrar={() => editar(null)}
        >
          <FormularioServicio
            servicio={edicion}
            profesionales={profesionales}
            sedes={sedes}
            alGuardar={cerrarEdicion}
          />
        </DialogoPanel>
      )}
    </>
  );
}
