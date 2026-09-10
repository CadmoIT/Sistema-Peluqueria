/** Protege y presenta la configuración que debe completarse antes de abrir el panel. */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { FormularioConfiguracionInicial } from "@/componentes/panel/formulario-configuracion-inicial";
import { autenticacion } from "@/lib/autenticacion";
import { buscarNegocioDelUsuario } from "@/servicios/configuracion-inicial.service";
import "./primeros-pasos.css";

export const metadata = { title: "Configurá tu negocio" };

export default async function PaginaPrimerosPasos() {
  if (process.env.MODO_DEMO === "true") {
    const configuracionDemo = (await cookies()).get(
      "configuracion-inicial-demo",
    );
    if (configuracionDemo) redirect("/panel");
  } else {
    const sesion = await autenticacion.api.getSession({
      headers: await headers(),
    });
    if (!sesion) redirect("/acceder?modo=ingreso");

    const membresia = await buscarNegocioDelUsuario(sesion.user.id);
    if (membresia) redirect("/panel");
  }

  return <FormularioConfiguracionInicial />;
}
