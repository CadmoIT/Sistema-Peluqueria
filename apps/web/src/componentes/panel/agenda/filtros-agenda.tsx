/** Agrupa filtros opcionales y la leyenda de estados seleccionables. */
"use client";
import {
  ESTADOS_AGENDA,
  type ProfesionalAgenda,
  type LocalAgenda,
} from "./agenda-modelo";
export function FiltrosAgenda({
  profesionales,
  locales,
  profesional,
  local,
  estados,
  cambiarProfesional,
  cambiarLocal,
  cambiarEstados,
}: {
  profesionales: ProfesionalAgenda[];
  locales: LocalAgenda[];
  profesional: string;
  local: string;
  estados: string[];
  cambiarProfesional: (id: string) => void;
  cambiarLocal: (id: string) => void;
  cambiarEstados: (ids: string[]) => void;
}) {
  return (
    <div className="agenda-filtros">
      {profesionales.length > 1 && (
        <label>
          Profesional
          <select
            value={profesional}
            onChange={(e) => cambiarProfesional(e.target.value)}
          >
            <option value="">Todos</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {locales.length > 1 && (
        <label>
          Local
          <select value={local} onChange={(e) => cambiarLocal(e.target.value)}>
            <option value="">Todos</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Estado
        <select
          value={
            estados.length === ESTADOS_AGENDA.length
              ? ""
              : estados.length === 1
                ? estados[0]
                : "VARIOS"
          }
          onChange={(e) =>
            cambiarEstados(
              e.target.value
                ? [e.target.value]
                : ESTADOS_AGENDA.map((g) => g.id),
            )
          }
        >
          <option value="">Todos</option>
          <option value="VARIOS" disabled>
            Varios estados
          </option>
          {ESTADOS_AGENDA.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Mostrar en la agenda</legend>
        {ESTADOS_AGENDA.map((g) => (
          <label key={g.id} className="agenda-leyenda">
            <input
              type="checkbox"
              style={{ accentColor: g.color }}
              checked={estados.includes(g.id)}
              onChange={(e) =>
                cambiarEstados(
                  e.target.checked
                    ? [...estados, g.id]
                    : estados.filter((id) => id !== g.id),
                )
              }
            />
            <span style={{ background: g.color }} aria-hidden="true" />
            {g.nombre}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
