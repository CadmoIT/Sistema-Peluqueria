/** Presenta el resumen operativo real del negocio autenticado. */
import {
  EnlacePanel as Link,
  VistaPanelLista,
} from "@/componentes/panel/navegacion-carga-panel";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  UsersRound,
} from "lucide-react";
import { nombrePlan } from "@turnos/config";
import { obtenerResumenPanel } from "@/servicios/panel-datos.service";
import { obtenerPerfilNegocio } from "@/lib/perfiles-negocio";
import { obtenerIconoServicios } from "@/componentes/panel/iconos-rubro";
import "./resumen.css";

export const metadata = { title: "Resumen" };

export default async function PaginaPanel() {
  const datos = await obtenerResumenPanel();
  const IconoServicios = obtenerIconoServicios(
    obtenerPerfilNegocio(datos.negocio.configuracion).iconoServicios,
  );
  const diasPrueba = datos.negocio.suscripcion?.pruebaFinalizaEn
    ? Math.max(
        0,
        Math.ceil(
          (datos.negocio.suscripcion.pruebaFinalizaEn.getTime() - Date.now()) /
            86_400_000,
        ),
      )
    : 0;
  const ahora = Date.now();
  const suscripcion = datos.negocio.suscripcion;
  const sitioDisponible =
    datos.negocio.publicado &&
    suscripcion?.estado !== "PAUSADA" &&
    suscripcion?.estado !== "CANCELADA" &&
    !(
      suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
      suscripcion.pruebaFinalizaEn &&
      suscripcion.pruebaFinalizaEn.getTime() < ahora
    ) &&
    !(
      suscripcion?.estado === "EN_GRACIA" &&
      suscripcion.graciaHasta &&
      suscripcion.graciaHasta.getTime() < ahora
    );
  const proximoTurno = datos.proximo
    ? formatoProximoTurno(datos.proximo.inicio, datos.negocio.zonaHoraria)
    : null;

  return (
    <div className="panel-contenido resumen-pagina">
      <VistaPanelLista ruta="/panel/resumen" />
      <section className="panel-bienvenida">
        <div className="resumen-pagina__cabecera">
          <h1>{datos.negocio.nombre}</h1>
          <Link
            className="enlace-sitio-resumen"
            href={
              sitioDisponible
                ? "/sitio/" + datos.negocio.slug
                : "/panel/mi-sitio"
            }
            target={sitioDisponible ? "_blank" : undefined}
            aria-label={
              sitioDisponible
                ? "Página Web, abrir sitio"
                : "Página Web, abrir vista previa"
            }
          >
            <span>Página Web</span>
            <ExternalLink size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="metricas-panel">
        <Metrica
          etiqueta="Turnos de hoy"
          valor={String(datos.turnosHoy)}
          href="/panel/agenda"
        />
        <Metrica
          etiqueta="Próximo turno"
          valor={
            proximoTurno ? (
              <>
                {proximoTurno.dia && (
                  <small className="resumen-metrica__dia">
                    {proximoTurno.dia}
                  </small>
                )}
                {proximoTurno.hora}
              </>
            ) : (
              "—"
            )
          }
          ariaValor={
            proximoTurno
              ? [proximoTurno.dia, proximoTurno.hora].filter(Boolean).join(" ")
              : "—"
          }
          href="/panel/agenda"
        />
        <Metrica
          etiqueta="Clientes"
          valor={String(datos.clientes)}
          href="/panel/clientes"
        />
        <Metrica
          etiqueta="Ingresos de hoy"
          valor={pesos(datos.ingresosHoy)}
          href="/panel/reportes"
        />
      </section>
      <div className="panel-grilla">
        <section className="agenda-modulo">
          <div className="modulo__titulo">
            <h2>Agenda de hoy</h2>
            <Link href="/panel/agenda">Ver agenda completa</Link>
          </div>
          {datos.reservas.length ? (
            <div
              className={
                datos.profesionales > 1
                  ? "tabla-turnos"
                  : "tabla-turnos tabla-turnos--sin-profesional"
              }
            >
              <div className="tabla-turnos__cabecera">
                <span>Hora</span>
                <span>Cliente</span>
                <span>Servicio</span>
                {datos.profesionales > 1 && <span>Profesional</span>}
                <span>Estado</span>
              </div>
              {datos.reservas.slice(0, 6).map((turno) => (
                <div className="tabla-turnos__fila" key={turno.id}>
                  <strong>
                    {hora(turno.inicio, datos.negocio.zonaHoraria)}
                  </strong>
                  <span>{nombreCliente(turno.cliente)}</span>
                  <span>
                    {turno.servicios[0]?.servicio.nombre ?? "Sin servicio"}
                  </span>
                  {datos.profesionales > 1 && (
                    <span>
                      {turno.profesional?.nombre ?? "Profesional eliminado"}
                    </span>
                  )}
                  <b className="resumen-estado">
                    {etiquetaEstado(turno.estado)}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <EstadoVacio />
          )}
        </section>
        <aside className="modulo resumen-lateral">
          <div className="modulo__titulo">
            <h2>Tu espacio</h2>
          </div>
          <Link
            className="prueba-panel"
            href="/panel/facturacion"
            aria-label="Ver plan y facturación"
          >
            <strong>
              {datos.negocio.suscripcion?.estado === "ACTIVA"
                ? "Plan activo"
                : datos.negocio.suscripcion?.estado === "EN_GRACIA"
                  ? "Pago pendiente"
                  : "Plan Gratis"}
            </strong>
            <span>
              {datos.negocio.suscripcion?.estado === "ACTIVA"
                ? nombrePlan(datos.negocio.suscripcion.plan)
                : `${diasPrueba} días de prueba restantes`}
            </span>
            {datos.negocio.suscripcion?.estado !== "ACTIVA" && (
              <span className="prueba-panel__accion">Ver planes</span>
            )}
          </Link>
          <Acceso
            icono={<IconoServicios />}
            texto={`${datos.servicios} servicios`}
            href="/panel/servicios"
          />
          <Acceso
            icono={<UsersRound />}
            texto={`${datos.profesionales} profesionales`}
            href="/panel/equipo"
          />
          <Acceso
            icono={<BarChart3 />}
            texto="Reportes"
            href="/panel/reportes"
          />
        </aside>
      </div>
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  href,
  ariaValor,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  href: string;
  ariaValor?: string;
}) {
  return (
    <Link
      className="resumen-metrica"
      href={href}
      aria-label={`${etiqueta}: ${ariaValor ?? String(valor)}`}
    >
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </Link>
  );
}
function Acceso({
  icono,
  texto,
  href,
}: {
  icono: React.ReactNode;
  texto: string;
  href: string;
}) {
  return (
    <Link className="acceso-resumen" href={href}>
      {icono}
      <span>{texto}</span>
    </Link>
  );
}
function EstadoVacio() {
  return (
    <div className="estado-vacio">
      <CalendarDays />
      <strong>Todavía no hay turnos para hoy</strong>
      <p>Creá un turno o compartí tu sitio para empezar a recibir reservas.</p>
      <Link href="/panel/agenda#nuevo">Crear turno</Link>
    </div>
  );
}
function hora(fecha: Date, zonaHoraria: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fecha);
}
function formatoProximoTurno(fecha: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: zonaHoraria,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  const fechaTurno = `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
  const hoy = new Intl.DateTimeFormat("es-AR", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obtenerHoy = (tipo: Intl.DateTimeFormatPartTypes) =>
    hoy.find((parte) => parte.type === tipo)?.value ?? "";
  const fechaHoy = `${obtenerHoy("year")}-${obtenerHoy("month")}-${obtenerHoy("day")}`;
  if (fechaTurno === fechaHoy)
    return { dia: null, hora: hora(fecha, zonaHoraria) };
  const dia = obtener("weekday")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(".", "")
    .toUpperCase();
  return { dia, hora: hora(fecha, zonaHoraria) };
}
function etiquetaEstado(estado: string) {
  const etiquetas: Record<string, string> = {
    BORRADOR: "Pendiente",
    RETENIDA: "Pendiente",
    PENDIENTE_PAGO: "Pendiente de pago",
    CONFIRMADA: "Confirmado",
    COMPLETADA: "Completado",
    CANCELADA: "Cancelado",
    VENCIDA: "Vencido",
    AUSENTE: "Ausente",
  };
  return etiquetas[estado] ?? estado.toLowerCase();
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
function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
