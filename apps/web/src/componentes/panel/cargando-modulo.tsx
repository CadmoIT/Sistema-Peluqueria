/** Reserva el espacio de títulos, acciones y tablas mientras carga un módulo. */
export function CargandoModulo({ nombre }: { nombre: string }) {
  return (
    <main className="panel-contenido" aria-label={`Cargando ${nombre}`} aria-busy="true">
      <div className="skeleton skeleton--titulo" />
      <div className="skeleton skeleton--filtros" />
      <div className="skeleton skeleton--tabla" />
    </main>
  );
}
