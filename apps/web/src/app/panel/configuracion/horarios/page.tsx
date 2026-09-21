/** Pantalla de configuración de horarios generales del negocio. */
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoHorarios } from "../contenido-configuracion";

export const metadata = { title: "Horarios" };

export default async function PaginaHorarios() {
  const datos = await obtenerConfiguracionNegocio();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/horarios"
      titulo="Horarios"
    >
      <ContenidoHorarios datos={datos} />
    </MarcoConfiguracion>
  );
}
