/** Mantiene visibles las secciones de ajustes durante la carga inicial. */
export default function CargandoConfiguracion() {
  return (
    <main
      className="panel-contenido"
      aria-label="Cargando configuraciones"
      aria-busy="true"
    >
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton skeleton--filtros" />
      <div className="skeleton skeleton--modulo" />
    </main>
  );
}
