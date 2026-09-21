/** Protege el panel con sesión válida y carga sus estilos específicos. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { autenticacion } from "@/lib/autenticacion";
import { buscarNegocioDelUsuario } from "@/servicios/configuracion-inicial.service";
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

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });
  if (!sesion) redirect("/acceder?modo=ingreso");
  const membresia = await buscarNegocioDelUsuario(sesion.user.id);
  if (!membresia) redirect("/primeros-pasos");
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
        emailUsuario={sesion.user.email}
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
