/** Representa el editor y su vista previa mientras se carga la configuración. */
export default function CargandoEditor() {
  return (
    <main
      className="panel-contenido panel-contenido--editor"
      aria-label="Cargando editor"
      aria-busy="true"
    >
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton-editor">
        <div className="skeleton skeleton--modulo" />
        <div className="skeleton skeleton--modulo" />
      </div>
    </main>
  );
}
