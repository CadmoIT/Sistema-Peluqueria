import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { MarcoConfiguracion } from "../marco-configuracion";
import { ContenidoSeguridad } from "../contenido-configuracion";

export const metadata = { title: "Seguridad y cuenta" };

export default async function PaginaSeguridad() {
  const { usuario } = await requerirContextoPanel();
  return (
    <MarcoConfiguracion
      ruta="/panel/configuracion/seguridad"
      titulo="Seguridad y cuenta"
      descripcion="Información sobre la protección de tus datos."
    >
      <ContenidoSeguridad
        email={usuario.email}
        emailVerificado={usuario.emailVerified}
      />
    </MarcoConfiguracion>
  );
}
