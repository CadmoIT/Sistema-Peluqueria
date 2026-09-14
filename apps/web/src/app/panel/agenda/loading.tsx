/** Representa el calendario mientras se cargan turnos, horarios y filtros. */
export default function CargandoAgenda() {
  return (
    <main
      className="panel-contenido panel-contenido--ancho"
      aria-label="Cargando agenda"
      aria-busy="true"
    >
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton skeleton--filtros" />
      <div className="skeleton skeleton--calendario" />
    </main>
  );
}
