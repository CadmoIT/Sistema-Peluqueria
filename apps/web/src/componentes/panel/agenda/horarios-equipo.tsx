/** Permite consultar y editar la jornada actual por sucursal y día de la semana. */
import { FormularioAccion } from "../formulario-accion";
import {
  guardarHorario,
  bloquearHorario,
  quitarBloqueo,
} from "@/app/panel/agenda/horarios-acciones";
type Horario = {
  sedeId: string;
  diaSemana: number;
  comienza: string;
  termina: string;
};
const dias = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export function HorariosEquipo({
  profesionalId,
  sedes,
  horarios,
  bloqueos,
}: {
  profesionalId: string;
  sedes: Array<{ id: string; nombre: string }>;
  horarios: Horario[];
  bloqueos: Array<{ id: string; motivo: string | null }>;
}) {
  return (
    <details className="equipo-operacion">
      <summary>Mis horarios y bloqueos</summary>
      <p>
        Las jornadas respetan la apertura de cada local y tus turnos existentes.
        Un bloqueo afecta tu disponibilidad en todos los locales.
      </p>
      {sedes.map((s) => (
        <details key={s.id}>
          <summary>Jornada de {s.nombre}</summary>
          <FormularioAccion
            accion={guardarHorario}
            texto="Guardar jornada"
            className="formulario-apilado"
          >
            <input type="hidden" name="profesionalId" value={profesionalId} />
            <input type="hidden" name="sedeId" value={s.id} />
            {dias.map((dia, indice) => {
              const h = horarios.find(
                (x) => x.sedeId === s.id && x.diaSemana === indice,
              );
              return (
                <fieldset key={dia}>
                  <legend>{dia}</legend>
                  <label>
                    <input
                      type="checkbox"
                      name="dias"
                      value={indice}
                      defaultChecked={Boolean(h)}
                    />
                    Trabajo este día
                  </label>
                  <label>
                    Desde
                    <input
                      type="time"
                      name={`comienza:${indice}`}
                      defaultValue={h?.comienza ?? "09:00"}
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      type="time"
                      name={`termina:${indice}`}
                      defaultValue={h?.termina ?? "18:00"}
                    />
                  </label>
                </fieldset>
              );
            })}
            <small>
              Desmarcá los días que no trabajás en este local. No se quitarán
              jornadas con turnos futuros sin resolver.
            </small>
          </FormularioAccion>
        </details>
      ))}
      <h2>Bloquear un horario</h2>
      <FormularioAccion
        accion={bloquearHorario}
        texto="Crear bloqueo"
        className="formulario-apilado"
      >
        <input type="hidden" name="profesionalId" value={profesionalId} />
        <label>
          Desde
          <input type="datetime-local" name="inicio" required />
        </label>
        <label>
          Hasta
          <input type="datetime-local" name="fin" required />
        </label>
        <label>
          Motivo
          <input name="motivo" maxLength={200} required />
        </label>
      </FormularioAccion>
      {bloqueos.map((b) => (
        <FormularioAccion
          key={b.id}
          accion={quitarBloqueo}
          texto="Quitar bloqueo"
          className="formulario-apilado"
        >
          <input type="hidden" name="id" value={b.id} />
          <p>{b.motivo}</p>
        </FormularioAccion>
      ))}
    </details>
  );
}
