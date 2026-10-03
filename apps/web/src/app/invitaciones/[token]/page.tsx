/** Entrada pública mínima; la cuenta verificada acepta la invitación en una segunda acción. */
import Link from "next/link";
import { headers } from "next/headers";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import {
  hashInvitacion,
  invitacionesEquipoHabilitadas,
} from "@/servicios/invitaciones-equipo.service";
import { AceptarInvitacion } from "@/componentes/panel/aceptar-invitacion";
export const metadata = {
  title: "Invitación al equipo",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Invitacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const i = /^[a-f0-9]{64}$/.test(token)
    ? await prisma.invitacionEquipo.findUnique({
        where: { tokenHash: hashInvitacion(token) },
        include: {
          profesional: {
            select: { activo: true, negocio: { select: { nombre: true } } },
          },
        },
      })
    : null;
  const s = await autenticacion.api.getSession({ headers: await headers() });
  const disponible =
    invitacionesEquipoHabilitadas() &&
    i &&
    (i.estado === "PENDIENTE" ||
      (i.estado === "ACEPTADA" && i.aceptadaPorId === s?.user.id)) &&
    i.expiraEn > new Date() &&
    i.profesional.activo;
  const callback = encodeURIComponent(`/invitaciones/${token}`);
  return (
    <main style={{ maxWidth: 560, margin: "60px auto", padding: 28 }}>
      <h1>
        {disponible
          ? `Sumate a ${i.profesional.negocio.nombre}`
          : "Invitación no disponible"}
      </h1>
      {!disponible ? (
        <p>
          Este enlace venció o fue cancelado. Pedile al dueño una nueva
          invitación.
        </p>
      ) : !s ? (
        <>
          <p>
            Creá tu cuenta personal o ingresá con el email que recibió la
            invitación. No necesitás crear un negocio ni contratar un plan.
          </p>
          <Link href={`/acceder?modo=registro&callbackURL=${callback}`}>
            Crear mi cuenta
          </Link>
          <p>
            <Link href={`/acceder?modo=ingreso&callbackURL=${callback}`}>
              Ya tengo una cuenta
            </Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Estás ingresando como {s.user.email}. Aceptá para vincular tu cuenta
            al negocio.
          </p>
          <AceptarInvitacion token={token} />
          <Link href={`/acceder?modo=ingreso&callbackURL=${callback}`}>
            Ingresar con otra cuenta
          </Link>
        </>
      )}
    </main>
  );
}
