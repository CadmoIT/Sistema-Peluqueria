/** Presenta clientes en una lista abierta con archivo, importación y exportación reales. */
import { Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { FormularioCliente } from "@/componentes/panel/formulario-cliente";
import { TablaClientes } from "@/componentes/panel/tabla-clientes";
import { obtenerClientes } from "@/servicios/panel-datos.service";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";
import "./clientes.css";
export const metadata = { title: "Clientes" };
export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const { clientes, sedes, localSeleccionado } = await obtenerClientes(
    parametros.local,
  );
  return (
    <div className="panel-contenido clientes-pagina">
      <VistaPanelLista ruta="/panel/clientes" />
      <header className="cabecera-seccion">
        <h1>Clientes</h1>
        <div className="acciones-seccion">
          {sedes.length > 1 && (
            <FiltroLocalUrl
              className="filtro-discreto"
              sedes={sedes}
              valor={localSeleccionado}
              ariaLabel="Filtrar clientes por local"
            />
          )}
          <details className="desplegable-accion">
            <summary className="boton boton--primario">
              <Plus /> Nuevo cliente
            </summary>
            <FormularioCliente />
          </details>
        </div>
      </header>
      <TablaClientes
        clientes={clientes.map((cliente) => ({
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email,
          telefono: cliente.telefono,
          ultimoTurno: cliente.reservas[0]?.inicio.toISOString() ?? null,
          visitas: cliente._count.reservas,
        }))}
      />
    </div>
  );
}
