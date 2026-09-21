/** Reserva las métricas, agenda y bloque lateral mientras carga el resumen. */
import { SkeletonPanel } from "@/componentes/panel/skeleton-panel";
export default function CargandoResumen() {
  return <SkeletonPanel ruta="/panel/resumen" />;
}
