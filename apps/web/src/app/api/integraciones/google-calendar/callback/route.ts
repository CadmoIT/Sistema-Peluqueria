/** Completa OAuth de Google Calendar, cifra los tokens y ejecuta la primera sincronización. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import {
  guardarConexionGoogle,
  intercambiarCodigoGoogle,
  leerEstadoGoogle,
} from "@/lib/google-calendar";

export async function GET(solicitud: Request) {
  const url = new URL(solicitud.url);
  const codigo = url.searchParams.get("code");
  const estado = leerEstadoGoogle(url.searchParams.get("state") ?? "");
  const sesion = await autenticacion.api.getSession({
    headers: solicitud.headers,
  });
  if (!codigo || !estado || !sesion || sesion.user.id !== estado.usuarioId)
    return NextResponse.redirect(
      new URL("/panel/equipo?google=error", solicitud.url),
    );
  try {
    const tokens = await intercambiarCodigoGoogle(codigo);
    await guardarConexionGoogle(estado, tokens);
    return NextResponse.redirect(
      new URL("/panel/equipo?google=conectado", solicitud.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/panel/equipo?google=error", solicitud.url),
    );
  }
}
