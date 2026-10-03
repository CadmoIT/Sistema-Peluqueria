/** Presenta clientes en una lista abierta con archivo, importación y exportación reales. */
import { Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { FormularioCliente } from "@/componentes/panel/formulario-cliente";
import { TablaClientes } from "@/componentes/panel/tabla-clientes";
import { obtenerClientes } from "@/servicios/panel-datos.service";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";
import "./clientes.css";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { guardarNotaCliente } from "./acciones";
export const metadata = { title: "Clientes" };
export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const c = await requerirContextoPanel();
  const { clientes, sedes, localSeleccionado } = await obtenerClientes(
    parametros.local,
  );
  const notas = await prisma.profesionalCliente.findMany({
    where: {
      clienteId: { in: clientes.map((x) => x.id) },
      ...(c.identidad.rol === "PROFESIONAL"
        ? { profesionalId: c.identidad.profesionalId! }
        : {}),
    },
    include: { profesional: { select: { nombre: true } } },
  });
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
      <details className="equipo-operacion">
        <summary>Historial y notas de clientes</summary>
        {clientes.map((cliente) => (
          <article key={cliente.id}>
            <h2>{cliente.nombre || cliente.email || "Cliente"}</h2>
            {notas
              .filter((n) => n.clienteId === cliente.id)
              .map((n) => (
                <p key={n.profesionalId}>
                  {c.identidad.rol !== "PROFESIONAL"
                    ? `${n.profesional.nombre}: `
                    : ""}
                  {n.notas || "Sin notas personales"}
                </p>
              ))}
            {c.identidad.rol === "PROFESIONAL" && (
              <FormularioAccion
                accion={guardarNotaCliente}
                texto="Guardar nota"
                className="formulario-apilado"
              >
                <input type="hidden" name="clienteId" value={cliente.id} />
                <label>
                  Mi nota privada
                  <textarea
                    name="notas"
                    maxLength={4000}
                    defaultValue={
                      notas.find((n) => n.clienteId === cliente.id)?.notas ?? ""
                    }
                  />
                </label>
              </FormularioAccion>
            )}
            {c.identidad.rol !== "PROFESIONAL" && cliente.notas && (
              <p>Nota histórica: {cliente.notas}</p>
            )}
          </article>
        ))}
      </details>
    </div>
  );
}
