/** Gestiona profesionales, presentación, disponibilidad e integración de calendario. */
/* eslint-disable @next/next/no-img-element -- Las imágenes remotas configurables se migrarán al adaptador R2. */
import { CalendarSync, Edit3, Plus, UserRound } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import {
  actualizarProfesional,
  eliminarProfesional,
  crearProfesional,
} from "./acciones";
import { BotonEliminar } from "@/componentes/panel/boton-eliminar";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { CampoImagen } from "@/componentes/panel/campo-imagen";
import { obtenerEquipo } from "@/servicios/panel-datos.service";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";

export const metadata = { title: "Equipo" };

export default async function PaginaEquipo({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const { profesionales, conexiones, sedes, servicios, localSeleccionado } =
    await obtenerEquipo(parametros.local);
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/equipo" />
      <header className="cabecera-seccion">
        <div>
          <h1>Equipo</h1>
        </div>
        <div className="acciones-seccion">
          {sedes.length > 1 && (
            <FiltroLocalUrl
              className="filtro-discreto"
              sedes={sedes}
              valor={localSeleccionado}
              ariaLabel="Filtrar equipo por local"
            />
          )}
          <details className="desplegable-accion">
            <summary className="boton boton--primario">
              <Plus /> Nuevo profesional
            </summary>
            <FormularioProfesional sedes={sedes} servicios={servicios} />
          </details>
        </div>
      </header>
      {profesionales.length ? (
        <div className="lista-equipo">
          {profesionales.map((profesional) => {
            const google = conexiones.find(
              (conexion) => conexion.profesionalId === profesional.id,
            );
            return (
              <article
                key={profesional.id}
                className={profesional.activo ? "" : "inactivo"}
              >
                <div className="avatar-profesional">
                  {profesional.foto ? (
                    <img src={profesional.foto} alt="" />
                  ) : (
                    iniciales(profesional.nombre, profesional.apellido)
                  )}
                </div>
                <div>
                  <h2>
                    {profesional.nombre} {profesional.apellido}
                  </h2>
                  <p>
                    {profesional.especialidad || "Especialidad sin completar"}
                  </p>
                </div>
                <div className="acciones-equipo">
                  <details className="desplegable-accion">
                    <summary
                      className="accion-icono accion-icono--editar"
                      aria-label={`Editar ${profesional.nombre}`}
                      title={`Editar ${profesional.nombre}`}
                    >
                      <Edit3 aria-hidden="true" />
                    </summary>
                    <FormularioProfesional
                      sedes={sedes}
                      servicios={servicios}
                      profesional={profesional}
                    />
                  </details>
                  <a
                    className="boton boton--secundario"
                    href={`/api/integraciones/google-calendar/conectar?profesionalId=${profesional.id}`}
                  >
                    <CalendarSync />
                    {google?.estado === "ACTIVA" ? "Reconectar" : "Google"}
                  </a>
                  <BotonEliminar
                    id={profesional.id}
                    nombre={`${profesional.nombre} ${profesional.apellido ?? ""}`.trim()}
                    advertencia="Se eliminarán su presentación y sus horarios. Si tiene turnos activos, primero cancelalos o reasignalos desde Agenda. Se revocará su acceso de Profesional y su conexión exclusiva de Google."
                    accion={eliminarProfesional}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="estado-vacio grande">
          <UserRound />
          <strong>Sumá a tu primera persona</strong>
          <p>Después vas a poder asignarle servicios, sedes y horarios.</p>
        </div>
      )}
    </div>
  );
}
type Opcion = { id: string; nombre: string };
type ProfesionalEditable = {
  id: string;
  nombre: string;
  apellido: string | null;
  especialidad: string | null;
  biografia: string | null;
  foto: string | null;
  sedes: Array<{ sedeId: string }>;
  servicios: Array<{ servicioId: string }>;
  horarios: Array<{
    sedeId: string;
    diaSemana: number;
    comienza: string;
    termina: string;
  }>;
};
const diasSemana = [
  { valor: 1, nombre: "Lunes" },
  { valor: 2, nombre: "Martes" },
  { valor: 3, nombre: "Miércoles" },
  { valor: 4, nombre: "Jueves" },
  { valor: 5, nombre: "Viernes" },
  { valor: 6, nombre: "Sábado" },
  { valor: 0, nombre: "Domingo" },
];

function FormularioProfesional({
  sedes,
  servicios,
  profesional,
}: {
  sedes: Opcion[];
  servicios: Opcion[];
  profesional?: ProfesionalEditable;
}) {
  const accion = profesional ? actualizarProfesional : crearProfesional;
  const primerHorario = profesional?.horarios[0];
  const diasConfigurados = new Set(
    profesional?.horarios.map((horario) => horario.diaSemana) ?? [
      1, 2, 3, 4, 5,
    ],
  );
  return (
    <FormularioAccion
      accion={accion}
      texto={profesional ? "Guardar cambios" : "Guardar profesional"}
    >
      <h2>{profesional ? "Editar profesional" : "Nuevo profesional"}</h2>
      {profesional && <input type="hidden" name="id" value={profesional.id} />}
      <div className="form-grid">
        <label>
          Nombre
          <input name="nombre" required defaultValue={profesional?.nombre} />
        </label>
        <label>
          Apellido
          <input name="apellido" defaultValue={profesional?.apellido ?? ""} />
        </label>
      </div>
      <label>
        Especialidad
        <input
          name="especialidad"
          placeholder="Por ejemplo, color y peinados"
          defaultValue={profesional?.especialidad ?? ""}
        />
      </label>
      <label>
        Biografía
        <textarea
          name="biografia"
          rows={3}
          defaultValue={profesional?.biografia ?? ""}
        />
      </label>
      <CampoImagen
        name="foto"
        etiqueta="Foto"
        tipo="profesional"
        valorInicial={profesional?.foto ?? ""}
      />
      {sedes.length > 1 ? (
        <fieldset className="selector-multiple">
          <legend>Locales</legend>
          {sedes.map((sede) => (
            <label key={sede.id}>
              <input
                type="checkbox"
                name="sedeIds"
                value={sede.id}
                defaultChecked={
                  !profesional ||
                  profesional.sedes.some(
                    (asignacion) => asignacion.sedeId === sede.id,
                  )
                }
              />
              {sede.nombre}
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="sedeIds" value={sedes[0]?.id ?? ""} />
      )}
      <fieldset className="selector-multiple">
        <legend>Servicios</legend>
        {servicios.map((servicio) => (
          <label key={servicio.id}>
            <input
              type="checkbox"
              name="servicioIds"
              value={servicio.id}
              defaultChecked={
                !profesional ||
                profesional.servicios.some(
                  (asignacion) => asignacion.servicioId === servicio.id,
                )
              }
            />
            {servicio.nombre}
          </label>
        ))}
      </fieldset>
      <fieldset className="selector-multiple horario-profesional">
        <legend>Horario semanal</legend>
        {sedes.length > 1 ? (
          <label>
            Local del horario
            <select
              name="horarioSedeId"
              defaultValue={primerHorario?.sedeId ?? sedes[0]?.id}
            >
              {sedes.map((sede) => (
                <option value={sede.id} key={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input
            name="horarioSedeId"
            type="hidden"
            value={sedes[0]?.id ?? ""}
          />
        )}
        <div className="dias-profesional">
          {diasSemana.map((dia) => (
            <label key={dia.valor}>
              <input
                type="checkbox"
                name="dias"
                value={dia.valor}
                defaultChecked={diasConfigurados.has(dia.valor)}
              />
              {dia.nombre}
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            Desde
            <input
              type="time"
              name="comienza"
              defaultValue={primerHorario?.comienza ?? "09:00"}
            />
          </label>
          <label>
            Hasta
            <input
              type="time"
              name="termina"
              defaultValue={primerHorario?.termina ?? "18:00"}
            />
          </label>
        </div>
      </fieldset>
    </FormularioAccion>
  );
}
function iniciales(nombre: string, apellido: string | null) {
  return `${nombre[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase();
}
