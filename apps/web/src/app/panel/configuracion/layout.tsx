/** Bloquea ajustes del negocio sin restringir la seguridad de la cuenta personal. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await requerirContextoPanel(),
    ruta = (await headers()).get("x-turnos-ruta");
  if (
    c.membresia.rol === "PROFESIONAL" &&
    ruta !== "/panel/configuracion/seguridad"
  )
    redirect("/panel/mi-cuenta");
  return children;
}
