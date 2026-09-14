/** Conserva la estructura de planes e historial mientras cargan los cobros. */
export default function CargandoFacturacion() {
  return (
    <main
      className="panel-contenido"
      aria-label="Cargando facturación"
      aria-busy="true"
    >
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton skeleton--filtros" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton--modulo" />
        <div className="skeleton skeleton--modulo" />
      </div>
      <div className="skeleton skeleton--tabla" />
    </main>
  );
}
