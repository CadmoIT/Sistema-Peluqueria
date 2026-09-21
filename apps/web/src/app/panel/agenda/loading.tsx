/** Comparte el skeleton de agenda con la navegación inmediata del panel. */
import { SkeletonPanel } from "@/componentes/panel/skeleton-panel";
export default function CargandoVista() {
  return <SkeletonPanel ruta="/panel/agenda" />;
}
