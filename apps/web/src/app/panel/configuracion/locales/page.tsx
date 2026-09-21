/** Pantalla de administración de locales y sus datos públicos. */
import { obtenerConfiguracionNegocio } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoLocales } from "../contenido-configuracion";

export const metadata = { title: "Locales" };

export default async function PaginaLocales() {
  const datos = await obtenerConfiguracionNegocio();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/locales"
      titulo="Locales"
    >
      <ContenidoLocales datos={datos} />
    </MarcoConfiguracion>
  );
}
