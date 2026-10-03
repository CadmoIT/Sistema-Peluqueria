/** Completa OAuth de Google Calendar, cifra los tokens y ejecuta la primera sincronización. */
import { NextResponse } from "next/server";
import { tieneAccesoOperativo } from "@turnos/config";
import { after } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { resolverContextoEquipo } from "@/servicios/contexto-equipo.service";
import { prisma } from "@/lib/prisma";
import {
  guardarConexionGoogle,
  intercambiarCodigoGoogle,
  leerEstadoGoogle,
  sincronizarTurnosGoogle,
} from "@/lib/google-calendar";

export async function GET(solicitud: Request) {
  const url = new URL(solicitud.url);
  const codigo = url.searchParams.get("code");
  const estado = leerEstadoGoogle(url.searchParams.get("state") ?? "");
  const sesion = await autenticacion.api.getSession({
    headers: solicitud.headers,
  });
  const retorno = (resultado: string) =>
    new URL(
      `/panel/agenda?google=${resultado}${estado?.fecha ? `&fecha=${estado.fecha}` : ""}`,
      solicitud.url,
    );
  if (!codigo || !estado || !sesion || sesion.user.id !== estado.usuarioId)
    return NextResponse.redirect(
      retorno(
        url.searchParams.get("error") === "access_denied"
          ? "cancelado"
          : "error",
      ),
    );
  try {
    async function validarAcceso() {
      const contexto = await resolverContextoEquipo(sesion!.user);
      if (
        !contexto ||
        contexto.negocio.id !== estado!.negocioId ||
        (contexto.identidad.rol === "PROFESIONAL" &&
          (contexto.identidad.profesionalId !== estado!.profesionalId ||
            (estado!.sedeId &&
              !contexto.identidad.sedeIds.includes(estado!.sedeId))))
      )
        throw new Error("El contexto de la cuenta cambió.");
      if (!tieneAccesoOperativo(contexto.negocio.suscripcion))
        throw new Error("El negocio está en sólo lectura.");
      if (
        estado!.profesionalId &&
        !(await prisma.profesional.findFirst({
          where: {
            id: estado!.profesionalId,
            negocioId: contexto.negocio.id,
            activo: true,
            ...(estado!.sedeId
              ? { sedes: { some: { sedeId: estado!.sedeId } } }
              : {}),
          },
          select: { id: true },
        }))
      )
        throw new Error("El profesional ya no está disponible.");
      if (
        estado!.sedeId &&
        !(await prisma.sede.findFirst({
          where: {
            id: estado!.sedeId,
            negocioId: contexto.negocio.id,
            activa: true,
          },
          select: { id: true },
        }))
      )
        throw new Error("La sucursal ya no está disponible.");
    }
    await validarAcceso();
    const tokens = await intercambiarCodigoGoogle(codigo);
    const conexionId = await guardarConexionGoogle(
      estado,
      tokens,
      validarAcceso,
    );
    after(() => sincronizarTurnosGoogle(conexionId));
    return NextResponse.redirect(retorno("conectado"));
  } catch {
    return NextResponse.redirect(retorno("error"));
  }
}
