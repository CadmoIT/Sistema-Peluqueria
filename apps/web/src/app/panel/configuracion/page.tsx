/** Centraliza los datos generales, la política de contacto y las sedes del negocio. */
import { Building2, MapPin, Save } from "lucide-react";
import {
  actualizarConfiguracionNegocio,
  actualizarPuntajeGoogle,
  actualizarSede,
} from "./acciones";
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";

export const metadata = { title: "Configuración" };
export default async function PaginaConfiguracion() {
  const { negocio, sedes } = await obtenerConfiguracionNegocio();
  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Configuración</h1>
          <p>Los datos guardados acá también alimentan tu página pública.</p>
        </div>
      </header>
      <div className="configuracion-panel">
        <form
          action={actualizarConfiguracionNegocio}
          className="modulo formulario-configuracion-real"
        >
          <h2>
            <Building2 /> Datos del negocio
          </h2>
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
            Dato requerido para reservar
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
          <button className="boton boton--primario">
            <Save /> Guardar datos
          </button>
        </form>
        <section className="modulo sedes-configuracion">
          <h2>
            <MapPin /> Sedes
          </h2>
          {sedes.map((sede) => (
            <div className="sede-configuracion" key={sede.id}>
              <form action={actualizarSede}>
                <input type="hidden" name="id" value={sede.id} />
                <label>
                  Nombre
                  <input name="nombre" defaultValue={sede.nombre} required />
                </label>
                <label>
                  Dirección
                  <input name="direccion" defaultValue={sede.direccion} />
                </label>
                <div className="form-grid">
                  <label>
                    Teléfono
                    <input name="telefono" defaultValue={sede.telefono ?? ""} />
                  </label>
                  <label>
                    Google Place ID
                    <input
                      name="googlePlaceId"
                      defaultValue={sede.googlePlaceId ?? ""}
                    />
                  </label>
                </div>
                <label>
                  Enlace de Google Maps
                  <input
                    name="googleMapsUrl"
                    type="url"
                    defaultValue={sede.googleMapsUrl ?? ""}
                  />
                </label>
                <button className="boton boton--secundario">
                  Guardar sede
                </button>
              </form>
              {sede.googlePlaceId && (
                <form
                  action={actualizarPuntajeGoogle}
                  className="actualizar-google"
                >
                  <input type="hidden" name="id" value={sede.id} />
                  <button className="boton boton--secundario">
                    Actualizar puntuación de Google
                  </button>
                  {sede.googlePuntaje && (
                    <span>
                      {Number(sede.googlePuntaje)} · {sede.googleResenas ?? 0}{" "}
                      valoraciones
                    </span>
                  )}
                </form>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
