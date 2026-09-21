/** Pantalla de configuración de mensajes automáticos para clientes. */
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoAvisos } from "../contenido-configuracion";

export const metadata = { title: "Mensajes automáticos" };

export default async function PaginaAvisos() {
  const datos = await obtenerConfiguracionNegocio();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/avisos"
      titulo="Mensajes automáticos"
    >
      <ContenidoAvisos datos={datos} />
    </MarcoConfiguracion>
  );
}
