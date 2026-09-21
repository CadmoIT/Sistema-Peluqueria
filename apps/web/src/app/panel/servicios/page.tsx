/** Presenta un catálogo simple con los datos necesarios para ofrecer y reservar servicios. */
import { Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { FormularioServicio } from "@/componentes/panel/formulario-servicio";
import { ListadoServicios } from "@/componentes/panel/listado-servicios";
import { obtenerCatalogo } from "@/servicios/panel-datos.service";
import { obtenerPerfilNegocio } from "@/lib/perfiles-negocio";
import "./servicios.css";
export const metadata = { title: "Servicios" };
export default async function PaginaServicios() {
  const datos = await obtenerCatalogo();
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
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Nuevo servicio
          </summary>
          <FormularioServicio profesionales={profesionales} sedes={sedes} />
        </details>
      </header>
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
            porcentajeSena: Number(servicio.porcentajeSena ?? 0),
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
