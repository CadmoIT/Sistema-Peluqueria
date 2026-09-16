/** Alinea vistas diarias gratuitas con un único desplazamiento y escala horaria. */
"use client";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { moverReserva } from "@/app/panel/agenda/acciones";
import { fechaLocalAUtc } from "@/servicios/disponibilidad.service";
import {
  fechaVisual,
  grupoEstado,
  jornadasDelDia,
  type EventoAgenda,
  type ProfesionalAgenda,
  type LocalAgenda,
} from "./agenda-modelo";

export function ColumnasAgenda({
  fecha,
  zona,
  personas,
  locales,
  eventos,
  minimo,
  maximo,
  elegir,
}: {
  fecha: string;
  zona: string;
  personas: ProfesionalAgenda[];
  locales: LocalAgenda[];
  eventos: EventoAgenda[];
  minimo: string;
  maximo: string;
  elegir: (evento: EventoAgenda) => void;
}) {
  const router = useRouter();
  const aMinutos = (hora: string) =>
    Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
  const inicioEscala = aMinutos(minimo);
  const filasEscala = Math.ceil((aMinutos(maximo) - inicioEscala) / 30);
  async function mover(
    id: string,
    inicio: Date | null,
    fin: Date | null,
    revertir: () => void,
  ) {
    if (!inicio || !fin) return revertir();
    const convertir = (d: Date) =>
      fechaLocalAUtc(
        d.toISOString().slice(0, 10),
        d.toISOString().slice(11, 16),
        zona,
      ).toISOString();
    try {
      await moverReserva(id, convertir(inicio), convertir(fin));
      toast.success("Turno actualizado.");
      router.refresh();
    } catch (error) {
      revertir();
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos modificar el turno.",
      );
    }
  }
  return (
    <div
      className="agenda-columnas-scroll"
      tabIndex={0}
      aria-label="Horarios y turnos del día"
    >
      <div
        className="agenda-columnas"
        style={{
          gridTemplateColumns: `72px repeat(${Math.max(1, personas.length)}, minmax(220px, 1fr))`,
        }}
      >
        <div className="agenda-escala" aria-label="Horas">
          <h3 aria-hidden="true">&nbsp;</h3>
          {Array.from(
            { length: filasEscala },
            (_, i) => inicioEscala + i * 30,
          ).map((m, i) => (
            <div className="agenda-escala__hora" key={m}>
              {(m % 60 === 0 || i === 0) && (
                <span>
                  {String(Math.floor(m / 60)).padStart(2, "0")}:
                  {String(m % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          ))}
        </div>
        {personas.map((persona) => {
          const propios = eventos.filter(
            (e) =>
              (!e.profesionalId || e.profesionalId === persona.id) &&
              (!e.sedeId ||
                !persona.localesIds?.length ||
                persona.localesIds.includes(e.sedeId)),
          );
          const jornadas = jornadasDelDia(fecha, persona, locales).sort(
            (a, b) => a.abre.localeCompare(b.abre),
          );
          let cursor = minimo.slice(0, 5);
          const cerrados: Array<{
            start: string;
            end: string;
            display: "background";
            backgroundColor: string;
            editable: boolean;
          }> = [];
          const agregarCerrado = (abre: string, cierra: string) => {
            if (abre < cierra)
              cerrados.push({
                start: `${fecha}T${abre}:00Z`,
                end: `${fecha}T${cierra}:00Z`,
                display: "background",
                backgroundColor: "#e5e7eb",
                editable: false,
              });
          };
          for (const j of jornadas) {
            agregarCerrado(cursor, j.abre);
            if (j.cierra > cursor) cursor = j.cierra;
          }
          agregarCerrado(cursor, maximo.slice(0, 5));
          return (
            <section
              key={persona.id}
              className="agenda-columna"
              aria-label={`Agenda de ${persona.nombre}`}
            >
              <h3 title={persona.nombre}>{persona.nombre}</h3>
              <FullCalendar
                key={`${fecha}-${minimo}-${maximo}`}
                plugins={[timeGridPlugin, interactionPlugin]}
                locale={esLocale}
                timeZone="UTC"
                initialView="timeGridDay"
                initialDate={fecha}
                headerToolbar={false}
                dayHeaders={false}
                allDaySlot={false}
                height="auto"
                slotMinTime={minimo}
                slotMaxTime={maximo}
                slotDuration="00:30:00"
                slotLabelFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                eventDidMount={(info) => {
                  if (info.event.display !== "background") {
                    info.el.setAttribute(
                      "aria-label",
                      `${info.timeText}, ${info.event.title}, ${grupoEstado(String(info.event.extendedProps.estado)).nombre}`,
                    );
                  }
                }}
                now={fechaVisual(new Date().toISOString(), zona)}
                nowIndicator
                editable
                eventMinHeight={48}
                events={[
                  ...propios.map((e) => ({
                    ...e,
                    start: fechaVisual(e.start, zona),
                    end: fechaVisual(e.end, zona),
                    backgroundColor: grupoEstado(e.estado).fondo,
                    borderColor: grupoEstado(e.estado).color,
                    textColor: "#111",
                  })),
                  ...cerrados,
                ]}
                eventContent={(info) =>
                  info.event.display === "background" ? null : (
                    <div className="agenda-evento">
                      <strong>{info.timeText}</strong>
                      <span>{info.event.title}</span>
                    </div>
                  )
                }
                eventClick={(info) => {
                  const evento = propios.find((e) => e.id === info.event.id);
                  if (evento) elegir(evento);
                }}
                eventDrop={(info) => {
                  void mover(
                    info.event.id,
                    info.event.start,
                    info.event.end,
                    info.revert,
                  );
                }}
                eventResize={(info) => {
                  void mover(
                    info.event.id,
                    info.event.start,
                    info.event.end,
                    info.revert,
                  );
                }}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
