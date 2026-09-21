/** Mantiene fuera de servicio el índice antiguo de configuración. */
import { notFound } from "next/navigation";

/** El índice histórico de configuración ya no existe; cada área tiene su propia pantalla. */
export default function PaginaConfiguracion() {
  notFound();
}
