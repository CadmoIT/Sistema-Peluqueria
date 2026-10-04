/** Gestiona profesionales, presentación, disponibilidad e integración de calendario. */
/* eslint-disable @next/next/no-img-element -- Las imágenes remotas configurables se migrarán al adaptador R2. */
import { CalendarSync, Edit3, Plus, UserRound } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import {
  actualizarProfesional,
  eliminarProfesional,
  crearProfesional,
  enviarInvitacion,
  cancelarInvitacion,
  quitarAcceso,
  habilitarAgendaDueno,
} from "./acciones";
import { BotonEliminar } from "@/componentes/panel/boton-eliminar";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { CampoImagen } from "@/componentes/panel/campo-imagen";
import { obtenerEquipo } from "@/servicios/panel-datos.service";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { prisma } from "@/lib/prisma";
import { invitacionesEquipoHabilitadas } from "@/servicios/invitaciones-equipo.service";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";
import { exigirPermisoEquipo } from "@/lib/permisos-equipo";

export const metadata = { title: "Equipo" };

export default async function PaginaEquipo({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const c = await requerirContextoPanel();
  exigirPermisoEquipo(c, "administrar");
  const puedeInvitar =
    c.membresia.rol === "DUENO" && invitacionesEquipoHabilitadas();
  const accesos = await prisma.profesional.findMany({
    where: { negocioId: c.negocio.id },
    select: {
      id: true,
      membresia: { include: { usuario: { select: { email: true } } } },
      invitaciones: { orderBy: { creadaEn: "desc" }, take: 1 },
    },
  });
  const correos = await prisma.correoPendiente.findMany({
    where: {
      claveIdempotencia: {
        in: accesos.flatMap((a) => a.invitaciones.map((i) => i.correoClave)),
      },
    },
    select: { claveIdempotencia: true, estado: true },
  });
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
          {c.membresia.rol === "DUENO" && !c.identidad.profesionalId && (
            <details className="desplegable-accion">
              <summary className="boton boton--secundario">
                Yo también atiendo
              </summary>
              <FormularioAccion
                accion={habilitarAgendaDueno}
                texto="Habilitar mi agenda"
                className="formulario-flotante formulario-apilado"
              >
                <h2>Tu agenda profesional</h2>
                <label>
                  Ficha profesional
                  <select name="profesionalId">
                    <option value="">Crear mi ficha</option>
                    {profesionales
                      .filter(
                        (p) => !accesos.find((a) => a.id === p.id)?.membresia,
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellido}
                        </option>
                      ))}
                  </select>
                </label>
                <p>
                  Seguís siendo dueño. Luego podrás configurar tus servicios y
                  horarios desde tu ficha.
                </p>
              </FormularioAccion>
            </details>
          )}
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
            <FormularioProfesional
              sedes={sedes}
              servicios={servicios}
              puedeInvitar={puedeInvitar}
            />
          </details>
        </div>
      </header>
      {profesionales.length ? (
        <div className="lista-equipo">
          {profesionales.map((profesional) => {
            const acceso = accesos.find((a) => a.id === profesional.id);
            const invitacion = acceso?.invitaciones[0];
            const esDueno = acceso?.membresia?.rol === "DUENO";
            const vinculada = Boolean(
              acceso?.membresia?.activo &&
              (esDueno || acceso.membresia.aceptadaEn),
            );
            const etiqueta = esDueno
              ? "Dueño · Agenda propia"
              : vinculada
                ? "Cuenta vinculada"
                : invitacion?.estado === "PENDIENTE"
                  ? invitacion.expiraEn < new Date()
                    ? "Invitación vencida"
                    : correos.find(
                          (c) => c.claveIdempotencia === invitacion.correoClave,
                        )?.estado === "FALLIDO"
                      ? "Envío fallido"
                      : "Invitación pendiente"
                  : acceso?.membresia && !acceso.membresia.activo
                    ? "Acceso revocado"
                    : "Sin cuenta";
            const google = conexiones.find(
              (conexion) => conexion.profesionalId === profesional.id,
            );
            return (
              <article
                key={profesional.id}
                className={`${profesional.activo ? "" : "inactivo"} ${vinculada ? "equipo-cuenta-vinculada" : ""}`}
              >
                <div className="avatar-profesional">
                  {profesional.foto ? (
                    <img src={profesional.foto} alt="" />
                  ) : (
                    iniciales(profesional.nombre, profesional.apellido)
                  )}
                </div>
                <div className="equipo-datos">
                  <h2>
                    {profesional.nombre} {profesional.apellido}
                  </h2>
                  <p>
                    {profesional.especialidad || "Especialidad sin completar"}
                  </p>
                  <small>
                    {acceso?.membresia?.usuario.email || invitacion?.email}
                  </small>
                </div>
                <div>
                  <span className={vinculada ? "equipo-insignia" : ""}>
                    {etiqueta}
                  </span>
                  {vinculada && !esDueno && !profesional.activo && (
                    <p>
                      Acceso suspendido mientras el profesional esté inactivo.
                    </p>
                  )}
                  {puedeInvitar &&
                    !esDueno &&
                    (vinculada ? (
                      <details>
                        <summary>Administrar acceso</summary>
                        <FormularioAccion
                          accion={quitarAcceso}
                          texto="Quitar acceso"
                          className="formulario-apilado"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={profesional.id}
                          />
                          <small>
                            No se borran datos ni se desactiva al profesional.
                          </small>
                        </FormularioAccion>
                      </details>
                    ) : (
                      <details>
                        <summary>Invitar / reenviar</summary>
                        <FormularioAccion
                          accion={enviarInvitacion}
                          texto="Enviar invitación"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={profesional.id}
                          />
                          <label>
                            Email
                            <input
                              type="email"
                              name="email"
                              required
                              defaultValue={
                                invitacion?.email ??
                                acceso?.membresia?.usuario.email ??
                                ""
                              }
                            />
                          </label>
                        </FormularioAccion>
                      </details>
                    ))}
                  {c.membresia.rol === "DUENO" &&
                    invitacion?.estado === "PENDIENTE" && (
                      <FormularioAccion
                        accion={cancelarInvitacion}
                        texto="Cancelar invitación"
                        className="formulario-apilado"
                      >
                        <input type="hidden" name="id" value={profesional.id} />
                      </FormularioAccion>
                    )}
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
                      puedeInvitar={puedeInvitar && !vinculada}
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
                    desactivar
                    advertencia="Se suspende su acceso y no se ofrecerán nuevas reservas con él. Sus turnos futuros e historial se conservarán: revisalos desde Agenda. Podés reactivarlo editando su ficha; quitar acceso es una acción separada."
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
  activo: boolean;
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
  puedeInvitar,
}: {
  sedes: Opcion[];
  servicios: Opcion[];
  profesional?: ProfesionalEditable;
  puedeInvitar: boolean;
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
      {profesional && (
        <label>
          <input
            name="activo"
            type="checkbox"
            defaultChecked={profesional.activo}
          />
          Disponible para nuevos turnos
        </label>
      )}
      {puedeInvitar && (
        <label>
          Email para invitar — opcional
          <input name="emailInvitacion" type="email" />
          <small>La cuenta se vincula recién cuando la persona acepta.</small>
        </label>
      )}
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
