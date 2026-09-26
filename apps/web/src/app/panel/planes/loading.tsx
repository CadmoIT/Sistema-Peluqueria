/** Mantiene la navegación inmediata mientras carga el catálogo de planes. */
import { SkeletonPanel } from "@/componentes/panel/skeleton-panel";

export default function CargandoPlanes() {
  return <SkeletonPanel ruta="/panel/planes" />;
}
