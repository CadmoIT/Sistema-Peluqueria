/** Filtra, edita y elimina clientes sin ocultar los datos incompletos. */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Search, Trash2, X } from "lucide-react";
import {
  actualizarCliente,
  eliminarCliente,
} from "@/app/panel/clientes/acciones";

export type ClienteFila = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  ultimoTurno: string | null;
  visitas: number;
};

export function TablaClientes({ clientes }: { clientes: ClienteFila[] }) {
  const router = useRouter();
  const [guardando, iniciarTransicion] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ClienteFila | null>(null);
  const visibles = useMemo(() => {
    const termino = busqueda.toLocaleLowerCase("es");
    return clientes.filter((cliente) =>
      Object.values(cliente).some((valor) =>
        String(valor ?? "")
          .toLocaleLowerCase("es")
          .includes(termino),
      ),
    );
  }, [busqueda, clientes]);

  return (
    <>
      <label className="buscador-panel">
        <Search />
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, apellido, email o teléfono"
        />
      </label>
      <div className="tabla-panel">
        <div className="tabla-panel__cabecera tabla-clientes">
          <span>Cliente</span>
          <span>Correo</span>
          <span>Teléfono</span>
          <span>Último turno</span>
          <span>Visitas</span>
          <span>Acciones</span>
        </div>
        {visibles.map((cliente) => (
          <div className="tabla-panel__fila tabla-clientes" key={cliente.id}>
            <strong>
              {[cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
                "Sin dato"}
            </strong>
            <span>{cliente.email || "Sin dato"}</span>
            <span>{cliente.telefono || "Sin dato"}</span>
            <span>
              {cliente.ultimoTurno
                ? new Intl.DateTimeFormat("es-AR").format(
                    new Date(cliente.ultimoTurno),
                  )
                : "Sin turnos"}
            </span>
            <span>{cliente.visitas}</span>
            <div className="acciones-tabla">
              <button
                type="button"
                className="accion-icono accion-icono--editar"
                aria-label="Editar cliente"
                onClick={() => setEditando(cliente)}
              >
                <Edit3 />
              </button>
              <form action={eliminarCliente}>
                <input type="hidden" name="id" value={cliente.id} />
                <button
                  className="accion-icono"
                  aria-label="Eliminar cliente"
                  disabled={cliente.visitas > 0}
                >
                  <Trash2 />
                </button>
              </form>
            </div>
          </div>
        ))}
        {!visibles.length && (
          <p className="sin-resultados">
            No encontramos clientes con esa búsqueda.
          </p>
        )}
      </div>

      {editando && (
        <div className="dialogo-fondo" role="presentation">
          <section className="dialogo-turno" role="dialog" aria-modal="true">
            <header>
              <div>
                <small>CLIENTE</small>
                <h2>Editar información</h2>
              </div>
              <button
                className="accion-icono"
                type="button"
                onClick={() => setEditando(null)}
                aria-label="Cerrar edición"
              >
                <X />
              </button>
            </header>
            <form
              className="formulario-dialogo"
              action={(datos) =>
                iniciarTransicion(async () => {
                  await actualizarCliente(datos);
                  setEditando(null);
                  router.refresh();
                })
              }
            >
              <input type="hidden" name="id" value={editando.id} />
              <div className="form-grid">
                <label>
                  Nombre
                  <input name="nombre" defaultValue={editando.nombre ?? ""} />
                </label>
                <label>
                  Apellido
                  <input
                    name="apellido"
                    defaultValue={editando.apellido ?? ""}
                  />
                </label>
              </div>
              <label>
                Correo
                <input
                  name="email"
                  type="email"
                  defaultValue={editando.email ?? ""}
                />
              </label>
              <label>
                Teléfono
                <input
                  name="telefono"
                  type="tel"
                  defaultValue={editando.telefono ?? ""}
                />
              </label>
              <label>
                Notas
                <textarea
                  name="notas"
                  rows={3}
                  defaultValue={editando.notas ?? ""}
                />
              </label>
              <button className="boton boton--primario" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
