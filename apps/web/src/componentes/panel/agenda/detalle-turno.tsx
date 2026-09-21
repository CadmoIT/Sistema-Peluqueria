/** Muestra el detalle accesible y las acciones válidas de un turno. */
"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useCierreExterior } from "@/componentes/interaccion/cierre-exterior";
import { cambiarEstadoReserva } from "@/app/panel/agenda/acciones";
import { grupoEstado, type EventoAgenda } from "./agenda-modelo";
export function DetalleTurno({
  evento,
  zona,
  cerrar,
  variosProfesionales,
  variosLocales,
}: {
  evento: EventoAgenda;
  zona: string;
  cerrar: () => void;
  variosProfesionales: boolean;
  variosLocales: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useCierreExterior(dialogo, cerrar);
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  useEffect(() => {
    dialogo.current?.showModal();
  }, []);
  function actualizar(estado: string) {
    iniciar(async () => {
      try {
        await cambiarEstadoReserva(evento.id, estado);
        toast.success("El estado del turno fue actualizado.");
        cerrar();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No pudimos actualizar el turno.",
        );
      }
    });
  }
  const acciones =
    evento.estado === "CONFIRMADA"
      ? [
          ["CANCELADA", "Cancelar"],
          ["AUSENTE", "Ausente"],
          ["COMPLETADA", "Completar"],
        ]
      : ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO"].includes(evento.estado)
        ? [
            ["CANCELADA", "Cancelar"],
            ["CONFIRMADA", "Confirmar"],
          ]
        : [];
  return (
    <dialog
      ref={dialogo}
      className="agenda-detalle"
      aria-labelledby="detalle-turno-titulo"
      onClose={cerrar}
    >
      <header>
        <div>
          <small>
            {evento.tipo === "google"
              ? "Google Calendar"
              : grupoEstado(evento.estado).nombre}
          </small>
          <h2 id="detalle-turno-titulo">{evento.cliente}</h2>
        </div>
        <button
          type="button"
          className="accion-icono"
          onClick={cerrar}
          aria-label="Cerrar detalle"
        >
          <X />
        </button>
      </header>
      <dl>
        <div>
          <dt>Servicio</dt>
          <dd>{evento.servicio}</dd>
        </div>
        {variosProfesionales && (
          <div>
            <dt>Profesional</dt>
            <dd>{evento.profesional || "Todos"}</dd>
          </div>
        )}
        {variosLocales && (
          <div>
            <dt>Local</dt>
            <dd>{evento.sede || "Todos"}</dd>
          </div>
        )}
        <div>
          <dt>Fecha</dt>
          <dd>
            {new Intl.DateTimeFormat("es-AR", {
              timeZone: zona,
              dateStyle: "long",
            }).format(new Date(evento.start))}
          </dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>
            {[evento.start, evento.end]
              .map((f) =>
                new Intl.DateTimeFormat("es-AR", {
                  timeZone: zona,
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                }).format(new Date(f)),
              )
              .join(" – ")}
          </dd>
        </div>
        {evento.observacion && (
          <div>
            <dt>Observación</dt>
            <dd>{evento.observacion}</dd>
          </div>
        )}
      </dl>
      {evento.tipo === "reserva" && (
        <footer>
          {acciones.map(([estado, texto]) => (
            <button
              key={estado}
              type="button"
              className="boton boton--secundario"
              disabled={pendiente}
              onClick={() => actualizar(estado!)}
            >
              {pendiente ? "Actualizando…" : texto}
            </button>
          ))}
        </footer>
      )}
    </dialog>
  );
}
