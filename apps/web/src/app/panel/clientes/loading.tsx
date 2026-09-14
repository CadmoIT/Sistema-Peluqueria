/** Representa el listado de clientes mientras se cargan sus registros. */
export default function CargandoClientes() {
  return (
    <main
      className="panel-contenido"
      aria-label="Cargando clientes"
      aria-busy="true"
    >
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton skeleton--filtros" />
      <div className="skeleton skeleton--tabla" />
    </main>
  );
}
