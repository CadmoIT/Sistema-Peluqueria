/** Organiza datos del negocio, locales, horarios e integraciones con lenguaje simple. */
import {
  Building2,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Link2,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  actualizarConfiguracionNegocio,
  actualizarPuntajeGoogle,
  actualizarSede,
} from "./acciones";
import { BotonEnvio } from "@/componentes/panel/boton-envio";
import { FormularioAvisos } from "@/componentes/panel/formulario-avisos";
import { googleCalendarConfigurado } from "@/lib/google-calendar";
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import {
  obtenerPerfilNegocio,
  puedeCambiarTipoNegocio,
} from "@/lib/perfiles-negocio";
import { FormularioRubro } from "@/componentes/panel/formulario-rubro";

export const metadata = { title: "Configuraciones" };

export default async function PaginaConfiguracion() {
  const { negocio, membresia, sedes, conexionesGoogle, configuracionAvisos } =
    await obtenerConfiguracionNegocio();
  const unicoLocal = sedes.length === 1;
  const googleDisponible = googleCalendarConfigurado();
  const googleActivo = conexionesGoogle.some(
    (conexion) => conexion.estado === "ACTIVA",
  );

  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Configuraciones</h1>
          <p>Administrá los datos que usa el panel y tu página pública.</p>
        </div>
      </header>

      <nav
        className="indice-configuracion"
        aria-label="Secciones de configuración"
      >
        <a href="#negocio">Datos del negocio</a>
        <a href="#locales">{unicoLocal ? "Datos del local" : "Locales"}</a>
        <a href="#horarios">Horarios y reservas</a>
        <a href="#avisos">Mensajes automáticos</a>
        <a href="#integraciones">Integraciones</a>
        <a href="#seguridad">Seguridad y cuenta</a>
      </nav>

      <div className="configuracion-sobria">
        <section id="negocio" className="seccion-ajustes">
          <Encabezado icono={<Building2 />} titulo="Datos del negocio">
            Esta información identifica tu espacio en TurnosRápidos.
          </Encabezado>
          <div className="ajustes-campos">
            <form
              action={actualizarConfiguracionNegocio}
              className="ajustes-campos"
            >
              <label>
                Nombre
                <input name="nombre" defaultValue={negocio.nombre} required />
              </label>
              <div className="form-grid">
                <label>
                  Correo
                  <input
                    name="email"
                    type="email"
                    defaultValue={negocio.email ?? ""}
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    name="telefono"
                    type="tel"
                    defaultValue={negocio.telefono ?? ""}
                  />
                </label>
              </div>
              <label>
                Dato que pedís al reservar
                <select
                  name="politicaContacto"
                  defaultValue={negocio.politicaContacto}
                >
                  <option value="CUALQUIERA">Correo o teléfono</option>
                  <option value="EMAIL">Correo</option>
                  <option value="TELEFONO">Teléfono</option>
                  <option value="NINGUNO">Ninguno</option>
                </select>
              </label>
              <BotonEnvio pendiente="Guardando datos…">
                <Save /> Guardar datos
              </BotonEnvio>
            </form>
            <FormularioRubro
              tipoNegocio={
                obtenerPerfilNegocio(negocio.configuracion).tipoNegocio
              }
              editable={puedeCambiarTipoNegocio(membresia.rol)}
            />
          </div>
        </section>

        <section id="locales" className="seccion-ajustes">
          <Encabezado
            icono={<MapPin />}
            titulo={unicoLocal ? "Datos del local" : "Locales"}
          >
            {unicoLocal
              ? "Dirección, teléfono y presencia en Google."
              : "Información independiente para cada uno de tus locales."}
          </Encabezado>
          <div className="ajustes-campos lista-locales">
            {!sedes.length && (
              <p className="aviso-ajustes">
                Todavía no hay un local. Completá los primeros pasos para
                comenzar.
              </p>
            )}
            {sedes.map((sede) => (
              <details key={sede.id} open={unicoLocal}>
                <summary>{unicoLocal ? negocio.nombre : sede.nombre}</summary>
                <form action={actualizarSede}>
                  <input type="hidden" name="id" value={sede.id} />
                  {!unicoLocal && (
                    <label>
                      Nombre del local
                      <input
                        name="nombre"
                        defaultValue={sede.nombre}
                        required
                      />
                    </label>
                  )}
                  {unicoLocal && (
                    <input type="hidden" name="nombre" value={sede.nombre} />
                  )}
                  <label>
                    Dirección
                    <input name="direccion" defaultValue={sede.direccion} />
                  </label>
                  <label>
                    Teléfono
                    <input name="telefono" defaultValue={sede.telefono ?? ""} />
                  </label>
                  <label>
                    Enlace del local en Google Maps
                    <input
                      name="googleMapsUrl"
                      type="url"
                      defaultValue={sede.googleMapsUrl ?? ""}
                      placeholder="Pegá el enlace que aparece al compartir el lugar"
                    />
                  </label>
                  <details className="ajuste-avanzado">
                    <summary>Configurar puntuación de Google</summary>
                    <label>
                      Identificador del lugar
                      <input
                        name="googlePlaceId"
                        defaultValue={sede.googlePlaceId ?? ""}
                      />
                      <small>
                        Se obtiene desde Google Places y permite actualizar la
                        puntuación.
                      </small>
                    </label>
                  </details>
                  <BotonEnvio
                    className="boton boton--secundario"
                    pendiente="Guardando local…"
                  >
                    Guardar {unicoLocal ? "local" : "cambios"}
                  </BotonEnvio>
                </form>
                {sede.googlePlaceId && process.env.GOOGLE_MAPS_API_KEY && (
                  <form
                    action={actualizarPuntajeGoogle}
                    className="actualizar-google"
                  >
                    <input type="hidden" name="id" value={sede.id} />
                    <BotonEnvio
                      className="boton boton--secundario"
                      pendiente="Actualizando…"
                    >
                      Actualizar puntuación
                    </BotonEnvio>
                    {sede.googlePuntaje && (
                      <span>
                        {Number(sede.googlePuntaje)} · {sede.googleResenas ?? 0}{" "}
                        valoraciones
                      </span>
                    )}
                  </form>
                )}
              </details>
            ))}
          </div>
        </section>

        <section id="horarios" className="seccion-ajustes">
          <Encabezado icono={<CalendarClock />} titulo="Horarios y reservas">
            La agenda usa estos horarios para mostrar disponibilidad.
          </Encabezado>
          <div className="ajustes-campos">
            {sedes.map((sede) => (
              <div className="resumen-horarios" key={sede.id}>
                {!unicoLocal && <strong>{sede.nombre}</strong>}
                <p>{resumirHorarios(sede.horarios)}</p>
              </div>
            ))}
            <p className="ayuda-ajustes">
              Los horarios detallados de cada profesional se administran desde
              Equipo.
            </p>
          </div>
        </section>

        <section id="avisos" className="seccion-ajustes">
          <Encabezado icono={<Mail />} titulo="Mensajes automáticos">
            Elegí qué avisos reciben tus clientes y mirá cómo se verán.
          </Encabezado>
          <FormularioAvisos
            inicial={{
              emailConfirmacionActivo:
                configuracionAvisos?.emailConfirmacionActivo ?? true,
              emailRecordatorioActivo:
                configuracionAvisos?.emailRecordatorioActivo ?? true,
              emailAsuntoConfirmacion:
                configuracionAvisos?.emailAsuntoConfirmacion ??
                "Tu turno en {negocio} está confirmado",
              emailTextoConfirmacion:
                configuracionAvisos?.emailTextoConfirmacion ??
                "Hola {nombre}, tu turno de {servicio} es el {fecha} a las {hora} en {negocio}.",
              emailAsuntoRecordatorio:
                configuracionAvisos?.emailAsuntoRecordatorio ??
                "Recordatorio de tu turno en {negocio}",
              emailTextoRecordatorio:
                configuracionAvisos?.emailTextoRecordatorio ??
                "Hola {nombre}, te recordamos tu turno de {servicio} el {fecha} a las {hora} en {negocio}.",
              whatsappConfirmacionActivo:
                configuracionAvisos?.whatsappConfirmacionActivo ?? false,
              whatsappRecordatorioActivo:
                configuracionAvisos?.whatsappRecordatorioActivo ?? false,
            }}
            emailConfigurado={Boolean(
              process.env.SMTP_HOST &&
              process.env.SMTP_USER &&
              process.env.SMTP_OAUTH_CLIENT_ID &&
              process.env.SMTP_OAUTH_CLIENT_SECRET &&
              process.env.SMTP_OAUTH_REFRESH_TOKEN,
            )}
            proActivo={
              negocio.suscripcion?.estado === "ACTIVA" &&
              negocio.suscripcion.plan === "pro"
            }
          />
        </section>

        <section id="integraciones" className="seccion-ajustes">
          <Encabezado icono={<Link2 />} titulo="Integraciones">
            Conectá servicios externos sin perder el control de tus datos.
          </Encabezado>
          <div className="ajustes-campos">
            <article className="estado-integracion">
              <div>
                {googleActivo ? <CircleCheck /> : <CircleAlert />}
                <span>
                  <strong>Google Calendar</strong>
                  <small>
                    {googleActivo
                      ? "Conectado y sincronizando ocupaciones."
                      : googleDisponible
                        ? "Listo para conectar."
                        : "No configurado en este entorno."}
                  </small>
                </span>
              </div>
              {googleDisponible && !googleActivo ? (
                <a
                  className="boton boton--secundario"
                  href="/api/integraciones/google-calendar/conectar"
                >
                  Conectar
                </a>
              ) : (
                <span className="etiqueta-estado">
                  {googleActivo ? "Conectado" : "No configurado"}
                </span>
              )}
            </article>
            <article className="estado-integracion">
              <div>
                <MapPin />
                <span>
                  <strong>Google Maps y puntuación</strong>
                  <small>
                    {process.env.GOOGLE_MAPS_API_KEY
                      ? "Disponible para los locales vinculados."
                      : "No configurado en este entorno."}
                  </small>
                </span>
              </div>
              <span className="etiqueta-estado">
                {process.env.GOOGLE_MAPS_API_KEY
                  ? "Disponible"
                  : "No configurado"}
              </span>
            </article>
          </div>
        </section>

        <section id="seguridad" className="seccion-ajustes">
          <Encabezado icono={<ShieldCheck />} titulo="Seguridad y cuenta">
            Tu sesión y los datos del negocio se mantienen separados de otros
            negocios.
          </Encabezado>
          <div className="ajustes-campos">
            <p className="aviso-ajustes">
              Las credenciales de Google y Mercado Pago se guardan cifradas.
              Ningún formulario permite elegir libremente el identificador del
              negocio.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Encabezado({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <header>
      <span>{icono}</span>
      <div>
        <h2>{titulo}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}

function resumirHorarios(
  horarios: Array<{
    diaSemana: number;
    abre: string;
    cierra: string;
    activo: boolean;
  }>,
) {
  const activos = horarios.filter((horario) => horario.activo);
  if (!activos.length) return "Todavía no hay horarios configurados.";
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return activos
    .map(
      (horario) =>
        dias[horario.diaSemana] + " " + horario.abre + "–" + horario.cierra,
    )
    .join(" · ");
}
