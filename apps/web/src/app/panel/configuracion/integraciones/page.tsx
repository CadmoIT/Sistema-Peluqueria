/** Pantalla de configuración de integraciones externas. */
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoIntegraciones } from "../contenido-configuracion";

export const metadata = { title: "Integraciones" };

export default async function PaginaIntegraciones() {
  const datos = await obtenerConfiguracionNegocio();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/integraciones"
      titulo="Integraciones"
      descripcion="Conectá servicios externos para trabajar desde un solo lugar."
    >
      <ContenidoIntegraciones datos={datos} />
    </MarcoConfiguracion>
  );
}
