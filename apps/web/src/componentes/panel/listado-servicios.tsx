/** Busca servicios en filas completas y abre detalles sin confundirlos con las acciones. */
"use client";
import { useState } from "react";
import { Edit3, Search } from "lucide-react";
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
    [detalle, abrir] = useState<Fila | null>(null);
  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const visibles = servicios.filter((s) =>
    normalizar(`${s.nombre} ${s.categoria}`).includes(normalizar(buscar)),
  );
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
      <div className="grilla-listado servicios-listado">
        {visibles.map((s) => (
          <article
            className={`tarjeta-listado servicio-fila ${s.activo ? "" : "inactivo"}`}
            key={s.id}
          >
            <button
              type="button"
              className="servicio-fila__detalle"
              onClick={() => abrir(s)}
              aria-label={`Ver detalles de ${s.nombre}`}
            >
              <div>
                <span className="servicio-fila__etiqueta">Nombre</span>
                <h2>{s.nombre}</h2>
              </div>
              <div>
                <span className="servicio-fila__etiqueta">Categoría</span>
                <strong>{s.categoria}</strong>
              </div>
              <div>
                <span className="servicio-fila__etiqueta">Precio</span>
                <strong>{dinero(s.precio)}</strong>
              </div>
              <div>
                <span className="servicio-fila__etiqueta">Duración</span>
                <strong>{s.duracionMinutos} min</strong>
              </div>
              <div>
                <span className="servicio-fila__etiqueta">Seña</span>
                <strong>{s.porcentajeSena}%</strong>
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
            <div>
              <dt>Seña</dt>
              <dd>{detalle.porcentajeSena}%</dd>
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
            <details className="desplegable-accion">
              <summary
                className="accion-icono accion-icono--editar"
                aria-label={`Editar ${detalle.nombre}`}
                title={`Editar ${detalle.nombre}`}
              >
                <Edit3 aria-hidden="true" />
              </summary>
              <FormularioServicio
                servicio={detalle}
                profesionales={profesionales}
                sedes={sedes}
              />
            </details>
            <BotonEliminar
              id={detalle.id}
              nombre={detalle.nombre}
              advertencia="Se eliminará este servicio del catálogo y de las asignaciones activas."
              accion={eliminarServicio}
            />
          </div>
        </DialogoPanel>
      )}
    </>
  );
}
