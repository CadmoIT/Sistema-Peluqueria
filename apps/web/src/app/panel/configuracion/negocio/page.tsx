import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoNegocio } from "../contenido-configuracion";

export const metadata = { title: "Datos del negocio" };

export default async function PaginaNegocio() {
  const datos = await obtenerConfiguracionNegocio();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/negocio"
      titulo="Datos del negocio"
    >
      <ContenidoNegocio datos={datos} />
    </MarcoConfiguracion>
  );
}
