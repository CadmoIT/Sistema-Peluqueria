/** Presenta un catálogo simple con los datos necesarios para ofrecer y reservar servicios. */
import { Plus } from "lucide-react";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { guardarDescuento } from "./precios-acciones";
import { descuentoNegocio } from "@/lib/precios-medios";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { FormularioServicio } from "@/componentes/panel/formulario-servicio";
import { ListadoServicios } from "@/componentes/panel/listado-servicios";
import { obtenerCatalogo } from "@/servicios/panel-datos.service";
import { obtenerPerfilNegocio } from "@/lib/perfiles-negocio";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";
import "./servicios.css";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
export const metadata = { title: "Servicios" };
export default async function PaginaServicios({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const datos = await obtenerCatalogo(parametros.local);
  if ((await requerirContextoPanel()).membresia.rol === "PROFESIONAL")
    return (
      <div className="panel-contenido">
        <VistaPanelLista ruta="/panel/servicios" />
        <h1>Servicios</h1>
        <p>
          Catálogo del negocio. El dueño administra los servicios y precios.
        </p>
        {datos.servicios.map((s) => (
          <article key={s.id} className="equipo-operacion">
            <h2>{s.nombre}</h2>
            <p>
              {s.duracionMinutos} minutos · $ {String(s.precio)} ·{" "}
              {s.profesionales.length === 0
                ? "Consultá tu asignación al dueño"
                : "Asignado a vos"}
            </p>
          </article>
        ))}
      </div>
    );
  const perfil = obtenerPerfilNegocio(datos.negocio.configuracion);
  const profesionales = datos.profesionales.map(({ id, nombre, apellido }) => ({
    id,
    nombre: [nombre, apellido].filter(Boolean).join(" "),
  }));
  const sedes = datos.sedes.map(({ id, nombre }) => ({ id, nombre }));
  return (
    <div className="panel-contenido servicios-pagina">
      <VistaPanelLista ruta="/panel/servicios" />
      <header className="cabecera-seccion">
        <h1>Servicios</h1>
        <div className="acciones-seccion">
          {datos.sedes.length > 1 && (
            <FiltroLocalUrl
              className="filtro-discreto"
              sedes={sedes}
              valor={datos.localSeleccionado}
              incluirTodos={false}
              ariaLabel="Filtrar servicios por local"
            />
          )}
          <details className="desplegable-accion">
            <summary className="boton boton--primario">
              <Plus /> Nuevo servicio
            </summary>
            <FormularioServicio profesionales={profesionales} sedes={sedes} />
          </details>
        </div>
      </header>
      {(await requerirContextoPanel()).membresia.rol === "DUENO" && (
        <details className="precios-config">
          <summary>
            Precios por medio de pago · Efectivo −
            {descuentoNegocio(datos.negocio.configuracion)}%
          </summary>
          <FormularioAccion
            accion={guardarDescuento}
            className="formulario-apilado"
          >
            <label>
              Descuento de efectivo (%)
              <input
                name="descuento"
                type="number"
                min="0"
                max="99"
                step="0.01"
                required
                defaultValue={descuentoNegocio(datos.negocio.configuracion)}
              />
            </label>
            <small>
              Para todos los servicios. Tarjeta y Mercado Pago mantienen el
              precio base. Se aplica al cobrar, no al reservar.
            </small>
          </FormularioAccion>
        </details>
      )}
      {datos.servicios.length ? (
        <ListadoServicios
          profesionales={profesionales}
          sedes={sedes}
          servicios={datos.servicios.map((servicio) => ({
            id: servicio.id,
            nombre: servicio.nombre,
            categoria: servicio.categoria?.nombre ?? "General",
            precio: Number(servicio.precio),
            duracionMinutos: servicio.duracionMinutos,
            activo: servicio.activo,
            profesionalIds: servicio.profesionales.map((p) => p.profesionalId),
            sedeIds: servicio.sedes.map((s) => s.sedeId),
          }))}
        />
      ) : (
        <div className="estado-vacio grande">
          <strong>Cargá tu primer servicio</strong>
          <p>
            Por ejemplo, {perfil.ejemploServicio}. Necesitás al menos uno para
            que tus clientes puedan reservar.
          </p>
        </div>
      )}
    </div>
  );
}
