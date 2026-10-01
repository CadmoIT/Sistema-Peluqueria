/** Reintenta exportaciones e importa ocupaciones desde los calendarios conectados. */
import { crearServicioGoogle } from "@turnos/google-calendar";
import { prisma } from "../lib/prisma.js";
import { tieneAccesoOperativo } from "@turnos/config";
export const COLA_SINCRONIZAR_GOOGLE = "sincronizar-google-calendar";
const google = crearServicioGoogle(prisma);
export async function sincronizarGoogleCalendar() {
  if (!google.googleCalendarConfigurado()) return;
  const conexiones = await prisma.conexionGoogleCalendar.findMany({
    where: { estado: { in: ["ACTIVA", "ERROR"] } },
    select: { id: true, negocio: { select: { suscripcion: true } } },
  });
  for (const conexion of conexiones) {
    if (!tieneAccesoOperativo(conexion.negocio.suscripcion)) continue;
    await google.sincronizarConexionGoogle(conexion.id);
    await google.sincronizarTurnosGoogle(conexion.id);
  }
}
