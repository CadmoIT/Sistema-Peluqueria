/** Resuelve el único negocio permitido para la cuenta, sin selector de rol. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import { resolverContextoEquipo } from "@/servicios/contexto-equipo.service";
export default async function SeleccionarNegocio() {
  const s = await autenticacion.api.getSession({ headers: await headers() });
  if (!s) redirect("/acceder");
  if (await resolverContextoEquipo(s.user)) redirect("/panel/resumen");
  if (!(await prisma.membresia.count({ where: { usuarioId: s.user.id } })))
    redirect("/primeros-pasos");
  return (
    <main className="panel-contenido">
      <h1>Acceso no disponible</h1>
      <p>Contactá al dueño del negocio para revisar tu acceso.</p>
      <a href="/acceder">Volver al acceso</a>
    </main>
  );
}
