/** Comparte el encabezado y el regreso entre las pantallas de configuración. */
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { EnlacePanel, VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";

export function MarcoConfiguracion({
  ruta,
  titulo,
  descripcion,
  children,
}: {
  ruta: string;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <div className="panel-contenido configuracion-pantalla">
      <VistaPanelLista ruta={ruta} />
      <header className="cabecera-seccion configuracion-cabecera">
        <div>
          <EnlacePanel href="/panel/resumen" className="configuracion-volver">
            <ArrowLeft aria-hidden /> Volver al resumen
          </EnlacePanel>
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>
      <div className="configuracion-sobria">{children}</div>
    </div>
  );
}
