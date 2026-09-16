/** Completa OAuth de Google Calendar, cifra los tokens y ejecuta la primera sincronización. */
import { NextResponse } from "next/server";
import { after } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
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
    const tokens = await intercambiarCodigoGoogle(codigo);
    const membresia = await (
      await import("@/lib/prisma")
    ).prisma.membresia.findFirst({
      where: {
        usuarioId: sesion.user.id,
        negocioId: estado.negocioId,
        activo: true,
      },
    });
    if (!membresia) throw new Error("La membresía ya no está activa.");
    const conexionId = await guardarConexionGoogle(estado, tokens);
    after(() => sincronizarTurnosGoogle(conexionId));
    return NextResponse.redirect(retorno("conectado"));
  } catch {
    return NextResponse.redirect(retorno("error"));
  }
}
