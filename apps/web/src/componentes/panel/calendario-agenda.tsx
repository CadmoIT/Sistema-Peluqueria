/** Presenta la agenda interactiva con vistas diaria, semanal y mensual. */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { Check, CircleX, ClockAlert, X } from "lucide-react";
import {
  cambiarEstadoReserva,
  moverReserva,
} from "@/app/panel/agenda/acciones";

export type EventoAgenda = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  editable: boolean;
  tipo: "reserva" | "google";
  estado: string;
  cliente: string;
  servicio: string;
  profesionalId: string;
  profesional: string;
  sedeId: string;
  sede: string;
};

export function CalendarioAgenda({
  eventos,
  profesionales,
  sedes,
}: {
  eventos: EventoAgenda[];
  profesionales: Array<{ id: string; nombre: string }>;
  sedes: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const [procesando, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const [profesional, setProfesional] = useState("");
  const [sede, setSede] = useState("");
  const [estado, setEstado] = useState("");
  const [seleccionado, setSeleccionado] = useState<EventoAgenda | null>(null);
  const eventosVisibles = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          (!profesional || evento.profesionalId === profesional) &&
          (!sede || evento.sedeId === sede) &&
          (!estado || evento.estado === estado),
      ),
    [estado, eventos, profesional, sede],
  );

  function actualizarEstado(nuevoEstado: string) {
    if (!seleccionado) return;
    iniciarTransicion(async () => {
      try {
        await cambiarEstadoReserva(seleccionado.id, nuevoEstado);
        setSeleccionado(null);
        setMensaje("El estado del turno fue actualizado.");
        router.refresh();
      } catch (error) {
        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos actualizar el turno.",
        );
      }
    });
  }

  return (
    <div className="calendario-panel">
      <div className="filtros-agenda">
        <label>
          Profesional
          <select
            value={profesional}
            onChange={(e) => setProfesional(e.target.value)}
          >
            <option value="">Todos</option>
            {profesionales.map((opcion) => (
              <option value={opcion.id} key={opcion.id}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sede
          <select value={sede} onChange={(e) => setSede(e.target.value)}>
            <option value="">Todas</option>
            {sedes.map((opcion) => (
              <option value={opcion.id} key={opcion.id}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="CONFIRMADA">Confirmados</option>
            <option value="PENDIENTE_PAGO">Pendientes</option>
            <option value="COMPLETADA">Completados</option>
            <option value="AUSENTE">Ausentes</option>
            <option value="CANCELADA">Cancelados</option>
            <option value="OCUPADO">Google Calendar</option>
          </select>
        </label>
      </div>
      {mensaje && (
        <p className="mensaje-calendario" role="status">
          {mensaje}
        </p>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={esLocale}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
        events={eventosVisibles}
        nowIndicator
        editable
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        height="auto"
        eventClick={(informacion) => {
          const evento = eventos.find(
            (item) => item.id === informacion.event.id,
          );
          if (evento) setSeleccionado(evento);
        }}
        eventDrop={async (info) => {
          if (!info.event.start || !info.event.end) return info.revert();
          try {
            await moverReserva(
              info.event.id,
              info.event.start.toISOString(),
              info.event.end.toISOString(),
            );
            setMensaje("Turno actualizado.");
          } catch (error) {
            info.revert();
            setMensaje(
              error instanceof Error
                ? error.message
                : "No pudimos mover el turno.",
            );
          }
        }}
        eventResize={async (info) => {
          if (!info.event.start || !info.event.end) return info.revert();
          try {
            await moverReserva(
              info.event.id,
              info.event.start.toISOString(),
              info.event.end.toISOString(),
            );
            setMensaje("Duración actualizada.");
          } catch (error) {
            info.revert();
            setMensaje(
              error instanceof Error
                ? error.message
                : "No pudimos modificar el turno.",
            );
          }
        }}
      />
      {seleccionado && (
        <div className="dialogo-fondo" role="presentation">
          <section className="dialogo-turno" role="dialog" aria-modal="true">
            <header>
              <div>
                <small>
                  {seleccionado.tipo === "google"
                    ? "GOOGLE CALENDAR"
                    : seleccionado.estado}
                </small>
                <h2>{seleccionado.cliente}</h2>
              </div>
              <button
                className="accion-icono"
                type="button"
                onClick={() => setSeleccionado(null)}
                aria-label="Cerrar detalle"
              >
                <X />
              </button>
            </header>
            <dl>
              <div>
                <dt>Servicio</dt>
                <dd>{seleccionado.servicio}</dd>
              </div>
              <div>
                <dt>Profesional</dt>
                <dd>{seleccionado.profesional}</dd>
              </div>
              <div>
                <dt>Sede</dt>
                <dd>{seleccionado.sede}</dd>
              </div>
              <div>
                <dt>Comienza</dt>
                <dd>{formatearFecha(seleccionado.start)}</dd>
              </div>
            </dl>
            {seleccionado.tipo === "reserva" &&
              seleccionado.estado === "CONFIRMADA" && (
                <footer>
                  <button
                    className="boton boton--secundario"
                    type="button"
                    disabled={procesando}
                    onClick={() => actualizarEstado("CANCELADA")}
                  >
                    <CircleX /> Cancelar
                  </button>
                  <button
                    className="boton boton--secundario"
                    type="button"
                    disabled={procesando}
                    onClick={() => actualizarEstado("AUSENTE")}
                  >
                    <ClockAlert /> Ausente
                  </button>
                  <button
                    className="boton boton--primario"
                    type="button"
                    disabled={procesando}
                    onClick={() => actualizarEstado("COMPLETADA")}
                  >
                    <Check /> Completar
                  </button>
                </footer>
              )}
            {seleccionado.tipo === "reserva" &&
              ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO"].includes(
                seleccionado.estado,
              ) && (
                <footer>
                  <button
                    className="boton boton--secundario"
                    type="button"
                    disabled={procesando}
                    onClick={() => actualizarEstado("CANCELADA")}
                  >
                    <CircleX /> Cancelar
                  </button>
                  <button
                    className="boton boton--primario"
                    type="button"
                    disabled={procesando}
                    onClick={() => actualizarEstado("CONFIRMADA")}
                  >
                    <Check /> Confirmar
                  </button>
                </footer>
              )}
          </section>
        </div>
      )}
    </div>
  );
}

function formatearFecha(valor: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(valor));
}
