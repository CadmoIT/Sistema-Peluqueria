/** Muestra el calendario real y permite crear turnos internos sin superposiciones. */
import { Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { CalendarioAgenda } from "@/componentes/panel/calendario-agenda";
import { FormularioTurno } from "@/componentes/panel/agenda/formulario-turno";
import { googleCalendarConfigurado } from "@/lib/google-calendar";
import { obtenerAgenda } from "@/servicios/panel-datos.service";
import { ConexionGoogleAgenda } from "@/componentes/panel/agenda/conexion-google-agenda";
import "./agenda.css";

export const metadata = { title: "Agenda" };

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const parametros = await searchParams;
  const datos = await obtenerAgenda(parametros.fecha);
  const googleDisponible = googleCalendarConfigurado();
  const eventos = [
    ...datos.reservas.map((reserva) => {
      const servicio = reserva.servicios[0]?.servicio.nombre ?? "Turno";
      return {
        id: reserva.id,
        title: `${nombreCliente(reserva.cliente)} · ${servicio}`,
        start: reserva.inicio.toISOString(),
        end: reserva.fin.toISOString(),
        editable: !["CANCELADA", "VENCIDA", "COMPLETADA", "AUSENTE"].includes(
          reserva.estado,
        ),
        tipo: "reserva" as const,
        estado: reserva.estado,
        cliente: nombreCliente(reserva.cliente),
        servicio,
        observacion: reserva.notas,
        profesionalId: reserva.profesionalId ?? "profesional-eliminado",
        profesional: reserva.profesional
          ? `${reserva.profesional.nombre} ${reserva.profesional.apellido ?? ""}`.trim()
          : "Profesional eliminado",
        sedeId: reserva.sedeId,
        sede: reserva.sede.nombre,
      };
    }),
    ...datos.bloqueos.map((bloqueo) => ({
      id: `google-${bloqueo.id}`,
      title: `Ocupado · ${bloqueo.conexion.nombre}`,
      start: bloqueo.inicio.toISOString(),
      end: bloqueo.fin.toISOString(),
      editable: false,
      tipo: "google" as const,
      estado: "OCUPADO",
      cliente: "Evento privado de Google",
      servicio: "Bloqueo externo",
      observacion: null,
      profesionalId: bloqueo.conexion.profesionalId ?? "",
      profesional: bloqueo.conexion.nombre,
      sedeId: bloqueo.conexion.sedeId ?? "",
      sede: "Calendario externo",
    })),
    ...datos.bloqueosInternos.map((bloqueo) => ({
      id: `bloqueo-${bloqueo.id}`,
      title: bloqueo.motivo || "Horario bloqueado",
      start: bloqueo.inicio.toISOString(),
      end: bloqueo.fin.toISOString(),
      editable: false,
      tipo: "bloqueo" as const,
      estado: "OCUPADO",
      cliente: "Horario bloqueado",
      servicio: bloqueo.motivo || "Bloqueo de atención",
      observacion: null,
      profesionalId: bloqueo.profesionalId,
      profesional: bloqueo.profesional.nombre,
      sedeId: "",
      sede: "",
    })),
  ];
  const puedeCrear =
    datos.sedes.length > 0 &&
    datos.profesionales.length > 0 &&
    datos.servicios.length > 0;
  return (
    <div className="panel-contenido panel-contenido--ancho panel-contenido--agenda">
      <VistaPanelLista ruta="/panel/agenda" />
      <header className="cabecera-seccion">
        <div>
          <h1>Agenda</h1>
        </div>
        <div className="acciones-seccion">
          <ConexionGoogleAgenda
            disponible={googleDisponible}
            fecha={datos.fecha}
            locales={datos.sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
            profesionales={datos.profesionales.map((p) => ({
              id: p.id,
              nombre: `${p.nombre} ${p.apellido ?? ""}`.trim(),
            }))}
            conexiones={datos.conexionesGoogle.map((c) => ({
              ...c,
              sincronizadoEn: c.sincronizadoEn?.toISOString() ?? null,
            }))}
          />
          <details className="desplegable-accion" id="nuevo">
            <summary className="boton boton--primario">
              <Plus /> Nuevo turno
            </summary>
            {puedeCrear ? (
              <FormularioTurno
                datos={{
                  fecha: datos.fecha,
                  sedes: datos.sedes.map((s) => ({
                    id: s.id,
                    nombre: s.nombre,
                  })),
                  profesionales: datos.profesionales.map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    apellido: p.apellido,
                  })),
                  servicios: datos.servicios.map((s) => ({
                    id: s.id,
                    nombre: s.nombre,
                  })),
                  clientes: datos.clientes.map((c) => ({
                    id: c.id,
                    nombre: c.nombre,
                    apellido: c.apellido,
                    email: c.email,
                    telefono: c.telefono,
                  })),
                }}
              />
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
        fecha={datos.fecha}
        zonaHoraria={datos.negocio.zonaHoraria}
        eventos={eventos}
        profesionales={[
          ...datos.profesionales.map((profesional) => ({
            id: profesional.id,
            nombre:
              `${profesional.nombre} ${profesional.apellido ?? ""}`.trim(),
            localesIds: profesional.sedes.map((s) => s.sedeId),
            horarios: profesional.horarios.map((horario) => ({
              sedeId: horario.sedeId,
              diaSemana: horario.diaSemana,
              comienza: horario.comienza,
              termina: horario.termina,
            })),
          })),
          ...(datos.reservas.some((r) => !r.profesionalId)
            ? [
                {
                  id: "profesional-eliminado",
                  nombre: "Profesional eliminado",
                  localesIds: [],
                  horarios: [],
                },
              ]
            : []),
        ]}
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

function nombreCliente(
  cliente: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
  } | null,
) {
  if (!cliente) return "Cliente eliminado";
  return (
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.email ||
    cliente.telefono ||
    "Cliente sin datos"
  );
}
