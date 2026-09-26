/** Protege el panel con sesión válida y carga sus estilos específicos. */
import { Toaster } from "sonner";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { EstructuraPanel } from "@/componentes/panel/estructura-panel";
import { obtenerPerfilNegocio } from "@/lib/perfiles-negocio";
import { ProveedorPerfilNegocio } from "@/componentes/panel/perfil-negocio-contexto";
import "./panel.css";
import "./panel-sobrio.css";
import "./panel-configuracion.css";
import "../precios/precios.css";
import "./panel-facturacion.css";
import "./panel-mi-sitio.css";
import "./panel-responsive.css";
import "./panel-tipografia.css";
import "./panel-formularios.css";
import "../sitio/sitio.css";

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, membresia } = await requerirContextoPanel();
  const configuracion =
    membresia.negocio.configuracion &&
    typeof membresia.negocio.configuracion === "object"
      ? (membresia.negocio.configuracion as Record<string, unknown>)
      : {};
  const imagenNegocio =
    typeof configuracion.imagenPerfil === "string"
      ? configuracion.imagenPerfil
      : "";
  const perfil = obtenerPerfilNegocio(membresia.negocio.configuracion);
  return (
    <ProveedorPerfilNegocio tipoNegocio={perfil.tipoNegocio}>
      <EstructuraPanel
        nombreNegocio={membresia.negocio.nombre}
        emailUsuario={usuario.email}
        imagenNegocio={imagenNegocio}
      >
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ className: "toast-turnos" }}
        />
      </EstructuraPanel>
    </ProveedorPerfilNegocio>
  );
}
