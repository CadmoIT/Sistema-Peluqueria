/** Protege y presenta la configuración que debe completarse antes de abrir el panel. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FormularioConfiguracionInicial } from "@/componentes/panel/formulario-configuracion-inicial";
import { autenticacion } from "@/lib/autenticacion";
import { buscarNegocioDelUsuario } from "@/servicios/configuracion-inicial.service";
import { esRubroValido } from "@/lib/registro-inicial";
import "./primeros-pasos.css";

export const metadata = { title: "Configurá tu negocio" };

export default async function PaginaPrimerosPasos({
  searchParams,
}: {
  searchParams: Promise<{ tipoNegocio?: string | string[] }>;
}) {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });
  if (!sesion) redirect("/acceder?modo=ingreso");
  const membresia = await buscarNegocioDelUsuario(sesion.user.id);
  if (membresia) redirect("/panel/resumen");

  const parametros = await searchParams;
  const tipoNegocio =
    typeof parametros.tipoNegocio === "string" &&
    esRubroValido(parametros.tipoNegocio)
      ? parametros.tipoNegocio
      : "";

  return <FormularioConfiguracionInicial tipoNegocioInicial={tipoNegocio} />;
}
