/** Presenta el asistente para crear y preparar la publicación del micrositio. */
import { AsistenteConfiguracion } from "@/componentes/panel/asistente-configuracion";
import "./configuracion.css";

export const metadata = { title: "Configurar mi página" };

export default function PaginaConfiguracion() {
  return <AsistenteConfiguracion />;
}
