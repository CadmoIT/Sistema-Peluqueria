/** Protege el panel con sesión válida y carga sus estilos específicos. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { buscarNegocioDelUsuario } from "@/servicios/configuracion-inicial.service";
import { EstructuraPanel } from "@/componentes/panel/estructura-panel";
import "./panel.css";

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
  const nombreUsuario = sesion.user.name;
  const nombreNegocio = membresia.negocio.nombre;
  const slug = membresia.negocio.slug;

  return (
    <EstructuraPanel
      nombreNegocio={nombreNegocio}
      nombreUsuario={nombreUsuario}
      slug={slug}
    >
      {children}
    </EstructuraPanel>
  );
}
