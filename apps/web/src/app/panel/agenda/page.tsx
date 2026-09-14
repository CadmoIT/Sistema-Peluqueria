/** Muestra el calendario real y permite crear turnos internos sin superposiciones. */
import { CalendarPlus, Cloud, Plus } from "lucide-react";
import { crearReservaPanel } from "./acciones";
import { CalendarioAgenda } from "@/componentes/panel/calendario-agenda";
import { BotonEnvio } from "@/componentes/panel/boton-envio";
import { googleCalendarConfigurado } from "@/lib/google-calendar";
import { obtenerAgenda } from "@/servicios/panel-datos.service";

export const metadata = { title: "Agenda" };

export default async function PaginaAgenda() {
  const datos = await obtenerAgenda();
  const googleDisponible = googleCalendarConfigurado();
  const eventos = [
    ...datos.reservas.map((reserva) => {
      const servicio = reserva.servicios[0]?.servicio.nombre ?? "Turno";
      return {
        id: reserva.id,
        title: `${nombreCliente(reserva.cliente)} · ${servicio}`,
        start: reserva.inicio.toISOString(),
        end: reserva.fin.toISOString(),
        backgroundColor: colorEstado(reserva.estado),
        borderColor: colorEstado(reserva.estado),
        editable: !["CANCELADA", "VENCIDA", "COMPLETADA"].includes(
          reserva.estado,
        ),
        tipo: "reserva" as const,
        estado: reserva.estado,
        cliente: nombreCliente(reserva.cliente),
        servicio,
        profesionalId: reserva.profesionalId,
        profesional:
          `${reserva.profesional.nombre} ${reserva.profesional.apellido ?? ""}`.trim(),
        sedeId: reserva.sedeId,
        sede: reserva.sede.nombre,
      };
    }),
    ...datos.bloqueos.map((bloqueo) => ({
      id: `google-${bloqueo.id}`,
      title: `Ocupado · ${bloqueo.conexion.nombre}`,
      start: bloqueo.inicio.toISOString(),
      end: bloqueo.fin.toISOString(),
      backgroundColor: "#64748b",
      borderColor: "#64748b",
      editable: false,
      tipo: "google" as const,
      estado: "OCUPADO",
      cliente: "Evento privado de Google",
      servicio: "Bloqueo externo",
      profesionalId: bloqueo.conexion.profesionalId ?? "",
      profesional: bloqueo.conexion.nombre,
      sedeId: bloqueo.conexion.sedeId ?? "",
      sede: "Calendario externo",
    })),
  ];
  const puedeCrear =
    datos.sedes.length > 0 &&
    datos.profesionales.length > 0 &&
    datos.servicios.length > 0;
  return (
    <div className="panel-contenido panel-contenido--ancho">
      <header className="cabecera-seccion">
        <div>
          <h1>Agenda</h1>
          <p>Turnos, bloqueos y disponibilidad en una vista clara.</p>
        </div>
        <div className="acciones-seccion">
          {googleDisponible ? (
            <a
              className="boton boton--secundario"
              href={`/api/integraciones/google-calendar/conectar${datos.sedes[0] ? `?sedeId=${datos.sedes[0].id}` : ""}`}
            >
              <Cloud /> Conectar Google
            </a>
          ) : (
            <details className="integracion-ayuda">
              <summary className="boton boton--secundario">
                <Cloud /> Conectar Google
              </summary>
              <div>
                <strong>Google Calendar no está configurado</strong>
                <p>
                  Cuando se agreguen las credenciales de Google, vas a poder
                  conectar un calendario desde acá.
                </p>
              </div>
            </details>
          )}
          <details className="desplegable-accion" id="nuevo">
            <summary className="boton boton--primario">
              <Plus /> Nuevo turno
            </summary>
            {puedeCrear ? (
              <FormularioTurno datos={datos} />
            ) : (
              <div className="formulario-flotante">
                <h2>Antes de crear un turno</h2>
                <p>Necesitás una sede, un servicio y un profesional activos.</p>
              </div>
            )}
          </details>
        </div>
      </header>
      <CalendarioAgenda
        eventos={eventos}
        profesionales={datos.profesionales.map((profesional) => ({
          id: profesional.id,
          nombre: `${profesional.nombre} ${profesional.apellido ?? ""}`.trim(),
        }))}
        sedes={datos.sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
          horarios: sede.horarios.map((horario) => ({
            diaSemana: horario.diaSemana,
            abre: horario.abre,
            cierra: horario.cierra,
            activo: horario.activo,
          })),
        }))}
      />
    </div>
  );
}

function FormularioTurno({
  datos,
}: {
  datos: Awaited<ReturnType<typeof obtenerAgenda>>;
}) {
  return (
    <form action={crearReservaPanel} className="formulario-flotante">
      <h2>
        <CalendarPlus /> Nuevo turno
      </h2>
      <label>
        Fecha y hora
        <input name="inicio" type="datetime-local" required />
      </label>
      {datos.sedes.length === 1 ? (
        <input type="hidden" name="sedeId" value={datos.sedes[0]!.id} />
      ) : (
        <label>
          Local
          <select name="sedeId" required>
            {datos.sedes.map((sede) => (
              <option value={sede.id} key={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Profesional
        <select name="profesionalId" required>
          {datos.profesionales.map((profesional) => (
            <option value={profesional.id} key={profesional.id}>
              {profesional.nombre} {profesional.apellido}
            </option>
          ))}
        </select>
      </label>
      <label>
        Servicio
        <select name="servicioId" required>
          {datos.servicios.map((servicio) => (
            <option value={servicio.id} key={servicio.id}>
              {servicio.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cliente existente
        <select name="clienteId">
          <option value="">Crear cliente rápido</option>
          {datos.clientes.map((cliente) => (
            <option value={cliente.id} key={cliente.id}>
              {nombreCliente(cliente)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nombre del cliente
        <input name="clienteNombre" />
      </label>
      <BotonEnvio pendiente="Guardando turno…">Guardar turno</BotonEnvio>
    </form>
  );
}
function nombreCliente(cliente: {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
}) {
  return (
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.email ||
    cliente.telefono ||
    "Cliente sin datos"
  );
}
function colorEstado(estado: string) {
  if (estado === "CONFIRMADA") return "#126783";
  if (estado === "CANCELADA") return "#a8a8a8";
  if (estado === "COMPLETADA") return "#21835f";
  return "#2a9fba";
}
