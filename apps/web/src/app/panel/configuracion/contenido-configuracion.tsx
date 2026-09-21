/** Contenido reutilizable de cada pantalla de configuración. */
import { MapPin, Plus, Save } from "lucide-react";
import {
  actualizarConfiguracionNegocio,
  actualizarImagenPerfil,
  actualizarHorariosSede,
  actualizarSede,
  crearSede,
} from "./acciones";
import { BotonEnvio } from "@/componentes/panel/boton-envio";
import { IntegracionGoogleConfiguracion } from "@/componentes/panel/integracion-google-configuracion";
import { FormularioAvisos } from "@/componentes/panel/formulario-avisos";
import { FormularioRubro } from "@/componentes/panel/formulario-rubro";
import { CampoImagenPerfil } from "@/componentes/panel/campo-imagen-perfil";
import { googleCalendarConfigurado } from "@/lib/google-calendar";
import {
  obtenerPerfilNegocio,
  puedeCambiarTipoNegocio,
} from "@/lib/perfiles-negocio";
import type { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";

export type DatosConfiguracion = Awaited<
  ReturnType<typeof obtenerConfiguracionNegocio>
>;

export function ContenidoNegocio({ datos }: { datos: DatosConfiguracion }) {
  const { negocio, membresia } = datos;
  const configuracion =
    negocio.configuracion && typeof negocio.configuracion === "object"
      ? (negocio.configuracion as Record<string, unknown>)
      : {};
  const imagenPerfil = typeof configuracion.imagenPerfil === "string" ? configuracion.imagenPerfil : "";
  return (
    <section className="seccion-ajustes">
      <div className="ajustes-campos">
        <div className="datos-negocio-grid">
          <form action={actualizarConfiguracionNegocio} className="ajustes-campos">
            <label>
              <span>Nombre</span>
              <input name="nombre" defaultValue={negocio.nombre} required />
            </label>
            <div className="form-grid">
              <label>
                <span>Correo</span>
                <input name="email" type="email" defaultValue={negocio.email ?? ""} />
              </label>
              <label>
                <span>Teléfono</span>
                <input name="telefono" type="tel" defaultValue={negocio.telefono ?? ""} />
              </label>
            </div>
            <label>
              <span>Dato que pedís al reservar</span>
              <select name="politicaContacto" defaultValue={negocio.politicaContacto}>
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
          <form action={actualizarImagenPerfil} className="formulario-imagen-negocio">
            <CampoImagenPerfil nombreNegocio={negocio.nombre} valorInicial={imagenPerfil} />
            <BotonEnvio className="boton boton--secundario" pendiente="Guardando imagen…">
              Guardar imagen
            </BotonEnvio>
          </form>
        </div>
        <FormularioRubro
          tipoNegocio={obtenerPerfilNegocio(negocio.configuracion).tipoNegocio}
          editable={puedeCambiarTipoNegocio(membresia.rol)}
        />
      </div>
    </section>
  );
}

export function ContenidoLocales({ datos }: { datos: DatosConfiguracion }) {
  const { negocio, membresia, sedes } = datos;
  const unicoLocal = sedes.length === 1;
  return (
    <section className="seccion-ajustes">
      <div className="ajustes-campos lista-locales">
        {!sedes.length && (
          <p className="aviso-ajustes">
            Todavía no hay un local. Completá los primeros pasos para comenzar.
          </p>
        )}
        {sedes.map((sede) => (
          <details key={sede.id} open={unicoLocal}>
            <summary>{unicoLocal ? negocio.nombre : sede.nombre}</summary>
            <form action={actualizarSede}>
              <input type="hidden" name="id" value={sede.id} />
              {!unicoLocal && (
                <label>
                  <span>Nombre del local</span>
                  <input name="nombre" defaultValue={sede.nombre} required />
                </label>
              )}
              {unicoLocal && <input type="hidden" name="nombre" value={sede.nombre} />}
              <label>
                <span>Dirección</span>
                <input name="direccion" defaultValue={sede.direccion} />
              </label>
              <label>
                <span>Teléfono</span>
                <input name="telefono" defaultValue={sede.telefono ?? ""} />
              </label>
              <label>
                <span>Enlace del local en Google Maps</span>
                <input
                  name="googleMapsUrl"
                  type="url"
                  defaultValue={sede.googleMapsUrl ?? ""}
                  placeholder="Pegá el enlace que aparece al compartir el lugar"
                />
              </label>
              <BotonEnvio className="boton boton--secundario" pendiente="Guardando local…">
                Guardar {unicoLocal ? "local" : "cambios"}
              </BotonEnvio>
            </form>
          </details>
        ))}
        {puedeCambiarTipoNegocio(membresia.rol) && (
          <details className="nuevo-local-ajuste">
            <summary><Plus aria-hidden /> Agregar un local</summary>
            <form action={crearSede}>
              <div className="form-grid">
                <label>
                  <span>Nombre del local</span>
                  <input name="nombre" required minLength={2} maxLength={100} placeholder="Por ejemplo, Palermo" />
                </label>
                <label>
                  <span>Dirección</span>
                  <input name="direccion" maxLength={240} placeholder="Calle y número" />
                </label>
              </div>
              <label>
                <span>Teléfono</span>
                <input name="telefono" type="tel" maxLength={50} placeholder="Opcional" />
              </label>
              <label>
                <span>Enlace del local en Google Maps</span>
                <input name="googleMapsUrl" type="url" placeholder="Pegá el enlace de Google Maps" />
              </label>
              <BotonEnvio className="boton boton--secundario" pendiente="Creando local…">
                <Plus /> Agregar local
              </BotonEnvio>
            </form>
          </details>
        )}
      </div>
    </section>
  );
}

export function ContenidoHorarios({ datos }: { datos: DatosConfiguracion }) {
  return (
    <section className="seccion-ajustes">
      <div className="horarios-sede-lista">
        {datos.sedes.map((sede) => (
          <form action={actualizarHorariosSede} className="horario-sede-formulario" key={sede.id}>
            <input type="hidden" name="sedeId" value={sede.id} />
            <div className="horario-sede-cabecera">
              <h2>{sede.nombre}</h2>
              <span>Horarios de atención</span>
            </div>
            <div className="horario-sede-filas">
              {diasSemana.map(({ indice, nombre }) => {
                const horario = sede.horarios.find((item) => item.diaSemana === indice);
                return (
                  <div className="horario-sede-fila" key={indice}>
                    <label className="horario-sede-dia">
                      <input
                        type="checkbox"
                        name={`activo-${indice}`}
                        defaultChecked={horario?.activo ?? false}
                      />
                      <span>{nombre}</span>
                    </label>
                    <label className="horario-sede-hora">
                      <span>Desde</span>
                      <input
                        type="time"
                        name={`abre-${indice}`}
                        defaultValue={horario?.abre ?? "09:00"}
                      />
                    </label>
                    <label className="horario-sede-hora">
                      <span>Hasta</span>
                      <input
                        type="time"
                        name={`cierra-${indice}`}
                        defaultValue={horario?.cierra ?? "18:00"}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <BotonEnvio className="boton boton--primario" pendiente="Guardando horarios…">
              <Save /> Guardar horarios
            </BotonEnvio>
          </form>
        ))}
      </div>
    </section>
  );
}

export function ContenidoAvisos({ datos }: { datos: DatosConfiguracion }) {
  const { negocio, configuracionAvisos } = datos;
  return (
    <section className="seccion-ajustes">
      <FormularioAvisos
        inicial={{
          emailConfirmacionActivo: configuracionAvisos?.emailConfirmacionActivo ?? true,
          emailRecordatorioActivo: configuracionAvisos?.emailRecordatorioActivo ?? true,
          emailAsuntoConfirmacion: configuracionAvisos?.emailAsuntoConfirmacion ?? `Tu turno quedó confirmado en ${negocio.nombre}`,
          emailTextoConfirmacion: configuracionAvisos?.emailTextoConfirmacion ?? `Hola (nombre),\n\n¡Tu turno quedó confirmado! Te esperamos para (servicio) el (fecha) a las (hora) en ${negocio.nombre}.\n\nSi necesitás revisar los detalles, podés hacerlo desde acá:\n(enlace)\n\n¡Gracias por elegirnos!`,
          emailAsuntoRecordatorio: configuracionAvisos?.emailAsuntoRecordatorio ?? `Mañana te esperamos en ${negocio.nombre}`,
          emailTextoRecordatorio: configuracionAvisos?.emailTextoRecordatorio ?? `Hola (nombre),\n\nTe recordamos que mañana, (fecha), tenés un turno de (servicio) a las (hora) en ${negocio.nombre}.\n\nSi necesitás revisar los detalles, podés hacerlo desde acá:\n(enlace)\n\n¡Nos vemos!`,
          whatsappConfirmacionActivo: configuracionAvisos?.whatsappConfirmacionActivo ?? false,
          whatsappRecordatorioActivo: configuracionAvisos?.whatsappRecordatorioActivo ?? false,
        }}
        nombreNegocio={negocio.nombre}
        proActivo={negocio.suscripcion?.estado === "ACTIVA" && negocio.suscripcion.plan === "pro"}
      />
    </section>
  );
}

export function ContenidoIntegraciones({ datos }: { datos: DatosConfiguracion }) {
  const googleDisponible = googleCalendarConfigurado();
  return (
    <section className="seccion-ajustes">
      <div className="ajustes-campos integraciones-ajustes">
        <IntegracionGoogleConfiguracion
          disponible={googleDisponible}
          conexiones={datos.conexionesGoogle.map((conexion) => ({
            id: conexion.id,
            nombre: conexion.nombre,
            estado: conexion.estado,
            ultimoError: conexion.ultimoError,
            sincronizadoEn: conexion.sincronizadoEn?.toISOString() ?? null,
          }))}
        />
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
            {process.env.GOOGLE_MAPS_API_KEY ? "Disponible" : "No configurado"}
          </span>
        </article>
      </div>
    </section>
  );
}

export function ContenidoSeguridad({
  email,
  emailVerificado,
}: {
  email: string;
  emailVerificado: boolean;
}) {
  return (
    <section className="seccion-ajustes">
      <div className="seguridad-cuenta">
        <section className="seguridad-bloque">
          <div className="seguridad-bloque__encabezado">
            <div>
              <h2>Tu cuenta</h2>
              <p>Estos son los datos que usamos para identificarte y proteger el acceso al panel.</p>
            </div>
            <span className={`seguridad-estado ${emailVerificado ? "seguridad-estado--ok" : "seguridad-estado--pendiente"}`}>
              {emailVerificado ? "Email verificado" : "Email pendiente de verificación"}
            </span>
          </div>
          <div className="seguridad-dato">
            <span>Email de acceso</span>
            <strong>{email}</strong>
          </div>
        </section>

        <section className="seguridad-bloque">
          <div className="seguridad-bloque__encabezado">
            <div>
              <h2>Contraseña</h2>
              <p>Si creés que alguien conoce tu contraseña, cambiala desde un enlace seguro.</p>
            </div>
            <a className="boton boton--secundario" href="/recuperar">Cambiar contraseña</a>
          </div>
          <p className="seguridad-ayuda">Te enviaremos el enlace a {email}. El enlace vence y la actualización revoca las sesiones anteriores.</p>
        </section>

        <section className="seguridad-bloque">
          <div className="seguridad-bloque__encabezado">
            <div>
              <h2>Protección de datos</h2>
              <p>Aplicamos controles para mantener segura la información de tu negocio.</p>
            </div>
          </div>
          <ul className="seguridad-lista">
            <li>Las sesiones usan cookies httpOnly y vencen automáticamente.</li>
            <li>Las credenciales de integraciones externas se almacenan cifradas.</li>
            <li>El acceso al panel requiere una cuenta autenticada con permisos.</li>
          </ul>
        </section>

        <section className="seguridad-bloque seguridad-bloque--legal">
          <div>
            <h2>Privacidad y ayuda</h2>
            <p>Podés consultar cómo usamos la información o pedir ayuda para ejercer tus derechos.</p>
          </div>
          <div className="seguridad-enlaces">
            <a href="/privacidad">Leer política de privacidad</a>
            <a href="/terminos">Leer términos y condiciones</a>
            <a href="mailto:soporte@turnosrapidos.com.ar">Contactar soporte</a>
          </div>
        </section>
      </div>
    </section>
  );
}

const diasSemana = [
  { indice: 1, nombre: "Lunes" },
  { indice: 2, nombre: "Martes" },
  { indice: 3, nombre: "Miércoles" },
  { indice: 4, nombre: "Jueves" },
  { indice: 5, nombre: "Viernes" },
  { indice: 6, nombre: "Sábado" },
  { indice: 0, nombre: "Domingo" },
] as const;
