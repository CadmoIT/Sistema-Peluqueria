/** Comparte la integración de Google con el worker usando la conexión Prisma de Next. */
import "server-only";
import { crearServicioGoogle } from "@turnos/google-calendar";
import { prisma } from "./prisma";
export const {
  googleCalendarConfigurado, crearUrlGoogleCalendar, leerEstadoGoogle,
  intercambiarCodigoGoogle, guardarConexionGoogle, sincronizarConexionGoogle,
  sincronizarReservaEnGoogle,
  sincronizarTurnosGoogle,
} = crearServicioGoogle(prisma);
