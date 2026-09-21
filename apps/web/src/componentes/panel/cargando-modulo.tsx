/** Conserva el componente compartido de carga para los módulos del panel. */
import { SkeletonPanel } from "./skeleton-panel";
export function CargandoModulo({ nombre }: { nombre: string }) {
  return <SkeletonPanel ruta={`/panel/${nombre}`} />;
}
