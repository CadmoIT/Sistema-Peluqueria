/** Protege el panel con sesión válida y carga sus estilos específicos. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import "./panel.css";

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.MODO_DEMO !== "true") {
    const sesion = await autenticacion.api.getSession({
      headers: await headers(),
    });
    if (!sesion) redirect("/acceder");
  }

  return children;
}
