/** Permite buscar, agregar e importar la base de clientes del negocio. */
import { Download, Plus } from "lucide-react";
import { crearCliente } from "./acciones";
import { ImportadorClientes } from "@/componentes/panel/importador-clientes";
import { TablaClientes } from "@/componentes/panel/tabla-clientes";
import { obtenerClientes } from "@/servicios/panel-datos.service";

export const metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  const { clientes } = await obtenerClientes();
  const filas = clientes.map((cliente) => ({
    id: cliente.id,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    email: cliente.email,
      telefono: cliente.telefono,
      notas: cliente.notas,
      ultimoTurno: cliente.reservas[0]?.inicio.toISOString() ?? null,
    visitas: cliente._count.reservas,
  }));
  return (
    <div className="panel-contenido">
      <Cabecera
        titulo="Clientes"
        descripcion="La información que tus clientes decidan compartir, ordenada en un solo lugar."
      >
        <a
          className="boton boton--secundario"
          href="data:text/csv;charset=utf-8,nombre,apellido,email,telefono"
          download="plantilla-clientes.csv"
        >
          <Download /> Plantilla
        </a>
        <ImportadorClientes />
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Nuevo cliente
          </summary>
          <FormularioCliente />
        </details>
      </Cabecera>
      <TablaClientes clientes={filas} />
    </div>
  );
}

function Cabecera({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <header className="cabecera-seccion">
      <div>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
      <div className="acciones-seccion">{children}</div>
    </header>
  );
}
function FormularioCliente() {
  return (
    <form action={crearCliente} className="formulario-flotante">
      <h2>Nuevo cliente</h2>
      <div className="form-grid">
        <label>
          Nombre
          <input name="nombre" />
        </label>
        <label>
          Apellido
          <input name="apellido" />
        </label>
        <label>
          Correo
          <input name="email" type="email" />
        </label>
        <label>
          Teléfono
          <input name="telefono" type="tel" />
        </label>
      </div>
      <label>
        Notas
        <textarea name="notas" rows={3} />
      </label>
      <button className="boton boton--primario">Guardar cliente</button>
    </form>
  );
}
