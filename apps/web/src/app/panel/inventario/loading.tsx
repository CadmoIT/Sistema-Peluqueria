/** Comparte el skeleton de inventario con la navegación inmediata del panel. */
import { SkeletonPanel } from "@/componentes/panel/skeleton-panel";
export default function CargandoVista() {
  return <SkeletonPanel ruta="/panel/inventario" />;
}
