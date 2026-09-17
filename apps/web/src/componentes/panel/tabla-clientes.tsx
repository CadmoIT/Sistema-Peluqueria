/** Busca, exporta y edita clientes, con confirmación del borrado definitivo. */
"use client";
import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { useCierreExterior } from "@/componentes/interaccion/cierre-exterior";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Edit3, Search, Trash2, X } from "lucide-react";
import {
  actualizarCliente,
  eliminarCliente,
  type ResultadoCliente,
} from "@/app/panel/clientes/acciones";
import { coincideCliente, type DatosCliente } from "@/lib/clientes-archivo";
import { CamposCliente } from "./campos-cliente";
import { ImportadorClientes } from "./importador-clientes";
export type ClienteFila = DatosCliente & {
  id: string;
  ultimoTurno: string | null;
  visitas: number;
};
export function TablaClientes({ clientes }: { clientes: ClienteFila[] }) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ClienteFila | null>(null);
  const [archivando, setArchivando] = useState<ClienteFila | null>(null);
  const [error, setError] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  const visible = Boolean(editando || archivando);
  function cerrar() {
    setEditando(null);
    setArchivando(null);
    setError("");
  }
  useCierreExterior(dialogo, cerrar, visible);
  useEffect(() => {
    if (visible) dialogo.current?.showModal();
  }, [visible]);
  const visibles = useMemo(
    () => clientes.filter((cliente) => coincideCliente(cliente, busqueda)),
    [clientes, busqueda],
  );
  async function realizar(
    accion: (datos: FormData) => Promise<ResultadoCliente>,
    datos: FormData,
  ) {
    iniciar(async () => {
      try {
        const resultado = await accion(datos);
        if (!resultado.ok) {
          setError(resultado.mensaje);
          toast.error(resultado.mensaje);
          return;
        }
        toast.success(resultado.mensaje);
        cerrar();
        router.refresh();
      } catch {
        setError("No pudimos completar la operación. Intentá nuevamente.");
        toast.error("No pudimos completar la operación.");
      }
    });
  }
  const query = new URLSearchParams({ buscar: busqueda });
  return (
    <>
      <div className="clientes-herramientas">
        <label className="buscador-panel">
          <Search />
          <input
            aria-label="Buscar clientes"
            value={busqueda}
            maxLength={200}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido, email o teléfono"
          />
        </label>
        <details className="desplegable-accion clientes-exportar">
          <summary className="boton boton--secundario">
            <Download /> Exportar clientes
          </summary>
          <div className="popover-panel">
            <a href={`/api/v1/clientes/exportar?${query}&formato=xlsx`}>
              Excel (.xlsx)
            </a>
            <a href={`/api/v1/clientes/exportar?${query}&formato=csv`}>CSV</a>
          </div>
        </details>
        <ImportadorClientes />
      </div>
      <div className="clientes-listado" role="table" aria-label="Clientes">
        <div className="tabla-panel__cabecera tabla-clientes" role="row">
          <span role="columnheader">Cliente</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Teléfono</span>
          <span role="columnheader">Último turno</span>
          <span role="columnheader">Visitas</span>
          <span role="columnheader">Acciones</span>
        </div>
        {visibles.map((cliente) => (
          <div
            className="tabla-panel__fila tabla-clientes"
            role="row"
            key={cliente.id}
          >
            <strong role="cell">
              {[cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
                "Sin dato"}
            </strong>
            <span role="cell">{cliente.email || "Sin dato"}</span>
            <span role="cell">{cliente.telefono || "Sin dato"}</span>
            <span role="cell">
              {cliente.ultimoTurno
                ? new Intl.DateTimeFormat("es-AR").format(
                    new Date(cliente.ultimoTurno),
                  )
                : "Sin turnos"}
            </span>
            <span role="cell">{cliente.visitas}</span>
            <div className="acciones-tabla" role="cell">
              <button
                type="button"
                className="accion-icono accion-icono--editar"
                aria-label="Editar cliente"
                disabled={guardando}
                onClick={() => {
                  setError("");
                  setEditando(cliente);
                }}
              >
                <Edit3 />
              </button>
              <button
                type="button"
                className="accion-icono accion-icono--eliminar"
                aria-label="Eliminar cliente"
                title="Eliminar cliente"
                disabled={guardando}
                onClick={() => {
                  setError("");
                  setArchivando(cliente);
                }}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
        {!visibles.length && (
          <p className="sin-resultados">
            {busqueda
              ? "No encontramos clientes con esa búsqueda."
              : "Todavía no hay clientes. Podés agregar uno o importar tu archivo."}
          </p>
        )}
      </div>
      {visible && (
        <dialog
          ref={dialogo}
          className="dialogo-turno dialogo-cliente"
          aria-labelledby="cliente-dialogo-titulo"
          onClose={cerrar}
        >
          <header>
            <h2 id="cliente-dialogo-titulo">
              {editando ? "Editar información" : "¿Eliminar cliente?"}
            </h2>
            <button
              className="accion-icono"
              type="button"
              onClick={cerrar}
              aria-label={editando ? "Cerrar edición" : "Cerrar confirmación"}
            >
              <X />
            </button>
          </header>
          {editando ? (
            <form
              className="formulario-dialogo formulario-cliente"
              action={(datos) => realizar(actualizarCliente, datos)}
            >
              <input type="hidden" name="id" value={editando.id} />
              <CamposCliente cliente={editando} />
              {error && <p role="alert">{error}</p>}
              <button
                className="boton boton--primario"
                disabled={guardando}
                aria-busy={guardando}
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          ) : (
            <form action={(datos) => realizar(eliminarCliente, datos)}>
              <input type="hidden" name="id" value={archivando!.id} />
              <p>
                Se perderán definitivamente el nombre, contacto y demás datos de
                esta ficha.
              </p>
              {error && <p role="alert">{error}</p>}
              <footer>
                <button
                  type="button"
                  className="boton boton--secundario"
                  onClick={cerrar}
                >
                  Cancelar
                </button>
                <button
                  className="boton boton--peligro"
                  disabled={guardando}
                  aria-busy={guardando}
                >
                  {guardando ? "Eliminando…" : "Eliminar cliente"}
                </button>
              </footer>
            </form>
          )}
        </dialog>
      )}
    </>
  );
}
