/** Comparte el skeleton de facturacion con la navegación inmediata del panel. */
import { SkeletonPanel } from "@/componentes/panel/skeleton-panel";
export default function CargandoVista() {
  return <SkeletonPanel ruta="/panel/facturacion" />;
}
