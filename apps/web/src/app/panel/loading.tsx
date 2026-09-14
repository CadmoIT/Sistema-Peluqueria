/** Mantiene estable la estructura del panel mientras se consultan los datos. */
export default function CargandoPanel() {
  return (
    <main
      className="panel-contenido"
      aria-label="Cargando contenido"
      aria-busy="true"
    >
      <div className="skeleton skeleton--corto" />
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }, (_, indice) => (
          <div className="skeleton skeleton--metrica" key={indice} />
        ))}
      </div>
      <div className="skeleton skeleton--modulo" />
    </main>
  );
}
