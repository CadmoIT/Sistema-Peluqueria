/** Presenta el resumen operativo real del negocio autenticado. */
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ContactRound,
  ExternalLink,
  Package,
  Plus,
  Scissors,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { obtenerResumenPanel } from "@/servicios/panel-datos.service";

export const metadata = { title: "Resumen" };

export default async function PaginaPanel() {
  const datos = await obtenerResumenPanel();
  const activas = datos.reservas.filter(
    (reserva) => !["CANCELADA", "VENCIDA"].includes(reserva.estado),
  );
  const confirmadas = datos.reservas.filter(
    (reserva) => reserva.estado === "CONFIRMADA",
  ).length;
  const pendientes = datos.reservas.filter((reserva) =>
    ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO"].includes(reserva.estado),
  ).length;
  const canceladas = datos.reservas.filter(
    (reserva) => reserva.estado === "CANCELADA",
  ).length;
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

  return (
    <div className="panel-contenido">
      <Link
        className="enlace-sitio-resumen"
        href={
          sitioDisponible ? "/sitio/" + datos.negocio.slug : "/panel/mi-sitio"
        }
        target={sitioDisponible ? "_blank" : undefined}
      >
        {sitioDisponible ? "Ver mi sitio" : "Vista previa de mi sitio"}{" "}
        <ExternalLink size={15} />
      </Link>
      <section className="panel-bienvenida">
        <div>
          <p>{fechaLarga(new Date(), datos.negocio.zonaHoraria)}</p>
          <h1>Resumen de {datos.negocio.nombre}</h1>
          <small>Todo lo importante para empezar el día.</small>
        </div>
        <Link className="boton boton--primario" href="/panel/agenda#nuevo">
          <Plus /> Nuevo turno
        </Link>
      </section>
      <section className="metricas-panel">
        <Metrica
          icono={<CalendarDays />}
          etiqueta="Turnos de hoy"
          valor={String(activas.length)}
          detalle={`${confirmadas} confirmados`}
        />
        <Metrica
          icono={<Clock3 />}
          etiqueta="Próximo turno"
          valor={
            datos.proximo
              ? hora(datos.proximo.inicio, datos.negocio.zonaHoraria)
              : "—"
          }
          detalle={
            datos.proximo
              ? `${fechaCorta(datos.proximo.inicio, datos.negocio.zonaHoraria)} · ${nombreCliente(datos.proximo.cliente)}`
              : "Agenda libre"
          }
        />
        <Metrica
          icono={<ContactRound />}
          etiqueta="Clientes"
          valor={String(datos.clientes)}
          detalle="Base del negocio"
        />
        <Metrica
          icono={<WalletCards />}
          etiqueta="Ingresos de hoy"
          valor={pesos(datos.ingresosHoy)}
          detalle="Caja registrada"
        />
      </section>
      <div className="panel-grilla">
        <section className="modulo agenda-modulo">
          <div className="modulo__titulo">
            <div>
              <h2>Agenda de hoy</h2>
              <p>
                {confirmadas} confirmados · {pendientes} pendientes ·{" "}
                {canceladas} cancelados
              </p>
            </div>
            <Link href="/panel/agenda">Ver agenda completa</Link>
          </div>
          {datos.reservas.length ? (
            <div className="tabla-turnos">
              <div className="tabla-turnos__cabecera">
                <span>Hora</span>
                <span>Cliente</span>
                <span>Servicio</span>
                <span>Profesional</span>
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
                  <span>{turno.profesional.nombre}</span>
                  <b className={`estado estado--${turno.estado.toLowerCase()}`}>
                    {turno.estado.replaceAll("_", " ")}
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
            <div>
              <h2>Tu espacio</h2>
              <p>Estado y próximos pasos</p>
            </div>
          </div>
          <div className="prueba-panel">
            <strong>
              {datos.negocio.suscripcion?.estado === "ACTIVA"
                ? "Plan activo"
                : datos.negocio.suscripcion?.estado === "EN_GRACIA"
                  ? "Pago pendiente"
                  : `${diasPrueba} días de prueba`}
            </strong>
            <span>
              {datos.negocio.publicado
                ? "Tu sitio está visible"
                : "Tu sitio está en borrador"}
            </span>
            {datos.negocio.suscripcion?.estado !== "ACTIVA" && (
              <Link className="prueba-panel__accion" href="/panel/facturacion">
                Ver planes
              </Link>
            )}
          </div>
          <Acceso
            icono={<Scissors />}
            texto={`${datos.servicios} servicios`}
            href="/panel/servicios"
          />
          <Acceso
            icono={<UsersRound />}
            texto={`${datos.profesionales} profesionales`}
            href="/panel/equipo"
          />
          <Acceso
            icono={<Package />}
            texto={`${datos.stockBajo} alertas de stock`}
            href="/panel/inventario"
          />
        </aside>
      </div>
    </div>
  );
}

function Metrica({
  icono,
  etiqueta,
  valor,
  detalle,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <article>
      <span className="metrica-icono">{icono}</span>
      <div>
        <small>{etiqueta}</small>
        <strong>{valor}</strong>
        <em>{detalle}</em>
      </div>
    </article>
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
  }).format(fecha);
}
function fechaLarga(fecha: Date, zonaHoraria: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zonaHoraria,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fecha);
}
function fechaCorta(fecha: Date, zonaHoraria: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zonaHoraria,
    day: "numeric",
    month: "short",
  }).format(fecha);
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
function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
