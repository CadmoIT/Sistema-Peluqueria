/** Coordina la fecha, filtros y columnas del calendario diario del negocio. */
"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ESTADOS_AGENDA,
  fechaEnZona,
  grupoEstado,
  rangoDelDia,
  type EventoAgenda,
  type ProfesionalAgenda,
  type LocalAgenda,
} from "./agenda/agenda-modelo";
import { MiniCalendario, FilaDias } from "./agenda/navegacion-fechas";
import { FiltrosAgenda } from "./agenda/filtros-agenda";
import { ColumnasAgenda } from "./agenda/columnas-agenda";
import { DetalleTurno } from "./agenda/detalle-turno";
export type { EventoAgenda } from "./agenda/agenda-modelo";

export function CalendarioAgenda({
  eventos,
  profesionales,
  sedes,
  fecha,
  zonaHoraria,
  localInicial = "",
}: {
  eventos: EventoAgenda[];
  profesionales: ProfesionalAgenda[];
  sedes: LocalAgenda[];
  fecha: string;
  zonaHoraria: string;
  localInicial?: string;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [profesional, setProfesional] = useState("");
  const [local, setLocal] = useState(localInicial);
  const [estados, setEstados] = useState(ESTADOS_AGENDA.map((g) => g.id));
  const [seleccionado, setSeleccionado] = useState<EventoAgenda | null>(null);
  const hoy = fechaEnZona(new Date(), zonaHoraria);
  const locales = local ? sedes.filter((l) => l.id === local) : sedes;
  const personas = profesionales.filter(
    (p) =>
      (!profesional || p.id === profesional) &&
      (!local ||
        (p.localesIds?.length
          ? p.localesIds.includes(local)
          : !p.horarios.length || p.horarios.some((j) => j.sedeId === local))),
  );
  const eventosFiltrados = eventos.filter(
    (e) =>
      (!local || !e.sedeId || e.sedeId === local) &&
      (!profesional || !e.profesionalId || e.profesionalId === profesional),
  );
  const rango = rangoDelDia(
    fecha,
    personas,
    locales,
    eventosFiltrados,
    zonaHoraria,
  );
  const visibles = eventosFiltrados.filter((e) =>
    estados.includes(grupoEstado(e.estado).id),
  );
  function elegirFecha(nueva: string) {
    const query = new URLSearchParams(parametros.toString());
    query.set("fecha", nueva);
    query.delete("agenda");
    query.delete("google");
    iniciar(() => router.replace(`/panel/agenda?${query}`, { scroll: false }));
  }
  const filtros = (
    <>
      <MiniCalendario fecha={fecha} hoy={hoy} elegir={elegirFecha} />
      <FiltrosAgenda
        profesionales={profesionales}
        locales={sedes}
        profesional={profesional}
        local={local}
        estados={estados}
        cambiarProfesional={setProfesional}
        cambiarLocal={setLocal}
        cambiarEstados={setEstados}
      />
    </>
  );
  return (
    <div className="agenda-diaria" aria-busy={pendiente}>
      <aside className="agenda-lateral">{filtros}</aside>
      <div className="agenda-principal">
        <details className="agenda-filtros-movil">
          <summary>Calendario y filtros</summary>
          {filtros}
        </details>
        <FilaDias
          fecha={fecha}
          hoy={hoy}
          elegir={elegirFecha}
          pendiente={pendiente}
        />
        {pendiente ? (
          <div
            className="skeleton skeleton--calendario"
            aria-label="Cargando turnos"
          />
        ) : personas.length ? (
          <ColumnasAgenda
            fecha={fecha}
            zona={zonaHoraria}
            personas={personas}
            locales={locales}
            eventos={visibles}
            minimo={rango.minimo}
            maximo={rango.maximo}
            elegir={setSeleccionado}
          />
        ) : (
          <p className="agenda-aviso">
            Agregá un profesional y sus horarios para comenzar.
          </p>
        )}
      </div>
      {seleccionado && (
        <DetalleTurno
          evento={seleccionado}
          zona={zonaHoraria}
          cerrar={() => setSeleccionado(null)}
          variosProfesionales={profesionales.length > 1}
          variosLocales={sedes.length > 1}
        />
      )}
    </div>
  );
}
