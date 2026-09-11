/** Encapsula OAuth, cifrado de tokens y sincronización privada con Google Calendar. */
import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "./prisma";

type EstadoGoogle = {
  usuarioId: string;
  negocioId: string;
  profesionalId: string | null;
  sedeId: string | null;
  expira: number;
};
const alcance = "https://www.googleapis.com/auth/calendar.events";

export function googleCalendarConfigurado() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  );
}

export function crearUrlGoogleCalendar(estado: EstadoGoogle) {
  const retorno = `${urlWeb()}/api/integraciones/google-calendar/callback`;
  const parametros = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri: retorno,
    response_type: "code",
    scope: alcance,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: firmarEstado(estado),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parametros}`;
}

export function leerEstadoGoogle(valor: string): EstadoGoogle | null {
  const [contenido, firma] = valor.split(".");
  if (!contenido || !firma) return null;
  const esperada = createHmac("sha256", secreto())
    .update(contenido)
    .digest("base64url");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const estado = JSON.parse(
    Buffer.from(contenido, "base64url").toString("utf8"),
  ) as EstadoGoogle;
  return estado.expira > Date.now() ? estado : null;
}

export async function intercambiarCodigoGoogle(codigo: string) {
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: `${urlWeb()}/api/integraciones/google-calendar/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!respuesta.ok) throw new Error("Google rechazó la autorización.");
  return respuesta.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    scope?: string;
  }>;
}

export async function guardarConexionGoogle(
  estado: EstadoGoogle,
  tokens: { access_token: string; refresh_token?: string; scope?: string },
) {
  const existente = await prisma.conexionGoogleCalendar.findFirst({
    where: {
      negocioId: estado.negocioId,
      profesionalId: estado.profesionalId,
      sedeId: estado.sedeId,
    },
  });
  const datos = {
    nombre: estado.profesionalId
      ? "Calendario profesional"
      : "Calendario general",
    calendarioId: "primary",
    accessTokenCifrado: cifrar(tokens.access_token),
    refreshTokenCifrado: tokens.refresh_token
      ? cifrar(tokens.refresh_token)
      : existente?.refreshTokenCifrado,
    alcance: tokens.scope ?? alcance,
    estado: "ACTIVA" as const,
    ultimoError: null,
  };
  const conexion = existente
    ? await prisma.conexionGoogleCalendar.update({
        where: { id: existente.id },
        data: datos,
      })
    : await prisma.conexionGoogleCalendar.create({
        data: {
          negocioId: estado.negocioId,
          profesionalId: estado.profesionalId,
          sedeId: estado.sedeId,
          ...datos,
        },
      });
  await sincronizarConexionGoogle(conexion.id);
}

export async function sincronizarConexionGoogle(conexionId: string) {
  const conexion = await prisma.conexionGoogleCalendar.findUnique({
    where: { id: conexionId },
  });
  if (!conexion?.accessTokenCifrado) return;
  try {
    const accessToken = await obtenerAccessToken(conexion);
    const resultado = await leerCambiosGoogle(conexion, accessToken);
    await prisma.$transaction(async (tx) => {
      for (const evento of resultado.eventos) {
        if (
          !evento.id ||
          evento.extendedProperties?.private?.turnosRapidosReservaId
        ) {
          continue;
        }
        if (evento.status === "cancelled") {
          await tx.eventoCalendarioExterno.updateMany({
            where: { conexionId, eventoId: evento.id },
            data: { cancelado: true },
          });
          continue;
        }
        if (!evento.start?.dateTime || !evento.end?.dateTime) continue;
        await tx.eventoCalendarioExterno.upsert({
          where: {
            conexionId_eventoId: { conexionId, eventoId: evento.id },
          },
          update: {
            inicio: new Date(evento.start.dateTime),
            fin: new Date(evento.end.dateTime),
            cancelado: false,
          },
          create: {
            conexionId,
            eventoId: evento.id,
            inicio: new Date(evento.start.dateTime),
            fin: new Date(evento.end.dateTime),
          },
        });
      }
    });
    await prisma.conexionGoogleCalendar.update({
      where: { id: conexionId },
      data: {
        sincronizadoEn: new Date(),
        syncToken: resultado.syncToken,
        estado: "ACTIVA",
        ultimoError: null,
      },
    });
  } catch (error) {
    await prisma.conexionGoogleCalendar.update({
      where: { id: conexionId },
      data: {
        estado: "ERROR",
        ultimoError:
          error instanceof Error ? error.message : "Error de sincronización",
      },
    });
  }
}

export async function sincronizarReservaEnGoogle(reservaId: string) {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: {
      negocio: true,
      sede: true,
      profesional: true,
      cliente: true,
      servicios: { include: { servicio: true }, orderBy: { orden: "asc" } },
      eventosGoogle: true,
    },
  });
  if (!reserva) return;

  const conexiones = await prisma.conexionGoogleCalendar.findMany({
    where: {
      negocioId: reserva.negocioId,
      estado: "ACTIVA",
      OR: [
        { profesionalId: reserva.profesionalId },
        { profesionalId: null, sedeId: reserva.sedeId },
        { profesionalId: null, sedeId: null },
      ],
    },
  });

  await Promise.all(
    conexiones.map(async (conexion) => {
      const vinculo = reserva.eventosGoogle.find(
        (evento) => evento.conexionId === conexion.id,
      );
      try {
        const accessToken = await obtenerAccessToken(conexion);
        const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conexion.calendarioId ?? "primary")}/events`;

        if (reserva.estado === "CANCELADA") {
          if (vinculo) {
            const respuesta = await fetch(
              `${base}/${encodeURIComponent(vinculo.eventoId)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );
            if (
              !respuesta.ok &&
              respuesta.status !== 404 &&
              respuesta.status !== 410
            ) {
              throw new Error("Google no pudo cancelar el evento.");
            }
          }
          return;
        }

        const nombreCliente =
          [reserva.cliente.nombre, reserva.cliente.apellido]
            .filter(Boolean)
            .join(" ") || "Cliente";
        const servicios = reserva.servicios
          .map((item) => item.servicio.nombre)
          .join(" + ");
        const cuerpo = {
          summary: `${servicios || "Turno"} · ${nombreCliente}`,
          description: `Turno gestionado por TurnosRápidos. Código ${reserva.codigo}.`,
          location: reserva.sede.direccion || undefined,
          start: {
            dateTime: reserva.inicio.toISOString(),
            timeZone: reserva.negocio.zonaHoraria,
          },
          end: {
            dateTime: reserva.fin.toISOString(),
            timeZone: reserva.negocio.zonaHoraria,
          },
          extendedProperties: {
            private: { turnosRapidosReservaId: reserva.id },
          },
        };
        const respuesta = await fetch(
          vinculo ? `${base}/${encodeURIComponent(vinculo.eventoId)}` : base,
          {
            method: vinculo ? "PATCH" : "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cuerpo),
          },
        );
        if (!respuesta.ok) throw new Error("Google no pudo guardar el evento.");
        const evento = (await respuesta.json()) as { id?: string };
        if (!vinculo && evento.id) {
          await prisma.eventoReservaGoogle.create({
            data: {
              reservaId: reserva.id,
              conexionId: conexion.id,
              eventoId: evento.id,
            },
          });
        }
        await prisma.conexionGoogleCalendar.update({
          where: { id: conexion.id },
          data: { ultimoError: null },
        });
      } catch (error) {
        await prisma.conexionGoogleCalendar.update({
          where: { id: conexion.id },
          data: {
            ultimoError:
              error instanceof Error
                ? error.message
                : "No se pudo exportar el turno.",
          },
        });
      }
    }),
  );
}

type EventoGoogle = {
  id?: string;
  status?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  extendedProperties?: { private?: { turnosRapidosReservaId?: string } };
};

async function leerCambiosGoogle(
  conexion: {
    calendarioId: string | null;
    syncToken: string | null;
  },
  accessToken: string,
) {
  const consultar = async (syncToken: string | null) => {
    const eventos: EventoGoogle[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    do {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conexion.calendarioId ?? "primary")}/events`,
      );
      const parametros = new URLSearchParams({
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "2500",
      });
      if (syncToken) {
        parametros.set("syncToken", syncToken);
      } else {
        const desde = new Date();
        desde.setDate(desde.getDate() - 30);
        const hasta = new Date();
        hasta.setDate(hasta.getDate() + 180);
        parametros.set("timeMin", desde.toISOString());
        parametros.set("timeMax", hasta.toISOString());
      }
      if (pageToken) parametros.set("pageToken", pageToken);
      url.search = parametros.toString();
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (respuesta.status === 410) return { vencido: true as const };
      if (!respuesta.ok) throw new Error("No pudimos leer el calendario.");
      const contenido = (await respuesta.json()) as {
        items?: EventoGoogle[];
        nextPageToken?: string;
        nextSyncToken?: string;
      };
      eventos.push(...(contenido.items ?? []));
      pageToken = contenido.nextPageToken;
      nextSyncToken = contenido.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    return {
      vencido: false as const,
      eventos,
      syncToken: nextSyncToken ?? syncToken,
    };
  };

  const incremental = await consultar(conexion.syncToken);
  if (!incremental.vencido) return incremental;
  return consultar(null).then((resultado) => {
    if (resultado.vencido)
      throw new Error("Google invalidó la sincronización.");
    return resultado;
  });
}

async function obtenerAccessToken(conexion: {
  accessTokenCifrado: string | null;
  refreshTokenCifrado: string | null;
}) {
  if (conexion.refreshTokenCifrado) {
    return renovarToken(descifrar(conexion.refreshTokenCifrado));
  }
  if (!conexion.accessTokenCifrado)
    throw new Error("Conexión sin credenciales.");
  return descifrar(conexion.accessTokenCifrado);
}

async function renovarToken(refreshToken: string) {
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!respuesta.ok) throw new Error("La autorización de Google venció.");
  const contenido = (await respuesta.json()) as { access_token: string };
  return contenido.access_token;
}
function firmarEstado(estado: EstadoGoogle) {
  const contenido = Buffer.from(JSON.stringify(estado)).toString("base64url");
  return `${contenido}.${createHmac("sha256", secreto()).update(contenido).digest("base64url")}`;
}
function cifrar(valor: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", claveCifrado(), iv);
  const cifrado = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), cifrado]
    .map((parte) => parte.toString("base64url"))
    .join(".");
}
function descifrar(valor: string) {
  const [iv, tag, cifrado] = valor
    .split(".")
    .map((parte) => Buffer.from(parte, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", claveCifrado(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(cifrado!), decipher.final()]).toString(
    "utf8",
  );
}
function claveCifrado() {
  return createHash("sha256")
    .update(process.env.INTEGRATIONS_ENCRYPTION_KEY ?? secreto())
    .digest();
}
function secreto() {
  return process.env.BETTER_AUTH_SECRET ?? "solo-desarrollo-turnos-rapidos";
}
function urlWeb() {
  return process.env.WEB_URL ?? "http://localhost:3000";
}
