/** Encapsula OAuth, cifrado de tokens y sincronización privada con Google Calendar. */
import type { PrismaClient } from "@prisma/client";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type EstadoGoogle = {
  usuarioId: string;
  negocioId: string;
  profesionalId: string | null;
  sedeId: string | null;
  expira: number;
  fecha?: string;
};
const alcance = "https://www.googleapis.com/auth/calendar.app.created";

export function crearServicioGoogle(
  prisma: PrismaClient,
  entorno: NodeJS.ProcessEnv = process.env,
  consultar: typeof fetch = fetch,
) {
  function googleCalendarConfigurado() {
    return Boolean(
      entorno.GOOGLE_CALENDAR_CLIENT_ID &&
      entorno.GOOGLE_CALENDAR_CLIENT_SECRET,
    );
  }

  function crearUrlGoogleCalendar(estado: EstadoGoogle) {
    const retorno = `${urlWeb()}/api/integraciones/google-calendar/callback`;
    const parametros = new URLSearchParams({
      client_id: entorno.GOOGLE_CALENDAR_CLIENT_ID!,
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

  function leerEstadoGoogle(valor: string): EstadoGoogle | null {
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

  async function intercambiarCodigoGoogle(codigo: string) {
    const respuesta = await consultar("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: codigo,
        client_id: entorno.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret: entorno.GOOGLE_CALENDAR_CLIENT_SECRET!,
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

  async function guardarConexionGoogle(
    estado: EstadoGoogle,
    tokens: { access_token: string; refresh_token?: string; scope?: string },
  ) {
    const existente = await prisma.conexionGoogleCalendar.findFirst({
      where: {
        negocioId: estado.negocioId,
        profesionalId: estado.profesionalId,
        sedeId: estado.sedeId,
        calendarioId: { not: "primary" },
      },
    });
    const negocio = await prisma.negocio.findUniqueOrThrow({
      where: { id: estado.negocioId },
      select: { nombre: true, zonaHoraria: true },
    });
    let calendarioId = existente?.calendarioId;
    if (calendarioId) {
      const respuesta = await consultar(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarioId)}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!respuesta.ok)
        throw new Error(
          "Reconectá la misma cuenta de Google para conservar este calendario.",
        );
    } else {
      const respuesta = await consultar(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: `TurnosRápidos · ${negocio.nombre}`,
            timeZone: negocio.zonaHoraria,
          }),
        },
      );
      if (!respuesta.ok)
        throw new Error("Google no pudo crear el calendario TurnosRápidos.");
      const calendario = (await respuesta.json()) as { id?: string };
      if (!calendario.id)
        throw new Error("Google no devolvió un calendario válido.");
      calendarioId = calendario.id;
    }
    const datos = {
      nombre: estado.profesionalId
        ? "Calendario profesional"
        : "Calendario general",
      calendarioId,
      accessTokenCifrado: cifrar(tokens.access_token),
      refreshTokenCifrado: tokens.refresh_token
        ? cifrar(tokens.refresh_token)
        : existente?.refreshTokenCifrado,
      alcance: tokens.scope ?? alcance,
      estado: "ACTIVA" as const,
      ultimoError: null,
      syncToken: null,
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
    if (!(await sincronizarConexionGoogle(conexion.id)))
      throw new Error("No pudimos completar la primera sincronización.");
    return conexion.id;
  }

  async function sincronizarConexionGoogle(conexionId: string) {
    const conexion = await prisma.conexionGoogleCalendar.findUnique({
      where: { id: conexionId },
    });
    if (!conexion?.accessTokenCifrado) return false;
    try {
      const accessToken = await obtenerAccessToken(conexion);
      const resultado = await leerCambiosGoogle(conexion, accessToken);
      await prisma.$transaction(async (tx) => {
        if (!conexion.syncToken || resultado.completo) {
          await tx.eventoCalendarioExterno.updateMany({
            where: { conexionId },
            data: { cancelado: true },
          });
        }
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
          if (evento.transparency === "transparent") {
            await tx.eventoCalendarioExterno.updateMany({
              where: { conexionId, eventoId: evento.id },
              data: { cancelado: true },
            });
            continue;
          }
          const fechaCompleta = (fecha: string) => {
            const estimada = new Date(`${fecha}T00:00:00Z`);
            const zona = evento.start?.timeZone || resultado.zona || "UTC";
            for (let i = 0; i < 2; i++) {
              const p = new Intl.DateTimeFormat("en-CA", {
                timeZone: zona,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }).formatToParts(estimada);
              const n = (tipo: string) =>
                Number(p.find((v) => v.type === tipo)?.value);
              estimada.setTime(
                estimada.getTime() -
                  (Date.UTC(
                    n("year"),
                    n("month") - 1,
                    n("day"),
                    n("hour"),
                    n("minute"),
                  ) -
                    Date.parse(`${fecha}T00:00:00Z`)),
              );
            }
            return estimada;
          };
          const inicio = evento.start?.dateTime
            ? new Date(evento.start.dateTime)
            : evento.start?.date
              ? fechaCompleta(evento.start.date)
              : null;
          const fin = evento.end?.dateTime
            ? new Date(evento.end.dateTime)
            : evento.end?.date
              ? fechaCompleta(evento.end.date)
              : null;
          if (!inicio || !fin) continue;
          await tx.eventoCalendarioExterno.upsert({
            where: {
              conexionId_eventoId: { conexionId, eventoId: evento.id },
            },
            update: {
              inicio,
              fin,
              cancelado: false,
            },
            create: {
              conexionId,
              eventoId: evento.id,
              inicio,
              fin,
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
      return true;
    } catch (error) {
      await prisma.conexionGoogleCalendar.update({
        where: { id: conexionId },
        data: {
          estado: "ERROR",
          ultimoError:
            error instanceof Error ? error.message : "Error de sincronización",
        },
      });
      return false;
    }
  }

  async function sincronizarReservaEnGoogle(
    reservaId: string,
    conexionId?: string,
  ) {
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
        ...(conexionId ? { id: conexionId } : {}),
        estado: { in: ["ACTIVA", "ERROR"] },
        OR: [
          ...(reserva.profesionalId ? [{ profesionalId: reserva.profesionalId }] : []),
          { profesionalId: null, sedeId: reserva.sedeId },
          { profesionalId: null, sedeId: null },
        ],
      },
    });

    const resultados = await Promise.all(
      conexiones.map(async (conexion) => {
        const vinculo = reserva.eventosGoogle.find(
          (evento) => evento.conexionId === conexion.id,
        );
        try {
          const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conexion.calendarioId ?? "primary")}/events`;

          if (["CANCELADA", "VENCIDA"].includes(reserva.estado)) {
            if (vinculo?.firma === "cancelado") return;
            if (vinculo) {
              const accessToken = await obtenerAccessToken(conexion);
              const respuesta = await consultar(
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
            if (vinculo)
              await prisma.eventoReservaGoogle.update({
                where: { id: vinculo.id },
                data: { firma: "cancelado" },
              });
            return;
          }
          if (!["CONFIRMADA", "COMPLETADA", "AUSENTE"].includes(reserva.estado))
            return;

          const nombreCliente =
            [reserva.cliente?.nombre, reserva.cliente?.apellido]
              .filter(Boolean)
              .join(" ") || (reserva.cliente ? "Cliente" : "Cliente eliminado");
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
          const firma = createHash("sha256")
            .update(JSON.stringify(cuerpo))
            .digest("hex");
          if (vinculo?.firma === firma) return;
          const accessToken = await obtenerAccessToken(conexion);
          const eventoId =
            vinculo?.eventoId ??
            createHash("sha256")
              .update(`${conexion.id}:${reserva.id}`)
              .digest("hex");
          const respuesta = await consultar(
            vinculo ? `${base}/${encodeURIComponent(vinculo.eventoId)}` : base,
            {
              method: vinculo ? "PATCH" : "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                vinculo ? cuerpo : { ...cuerpo, id: eventoId },
              ),
            },
          );
          if (respuesta.status === 409 && !vinculo) {
            const actualizada = await consultar(`${base}/${eventoId}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(cuerpo),
            });
            if (!actualizada.ok)
              throw new Error("Google no pudo actualizar el evento existente.");
          } else if (!respuesta.ok) {
            throw new Error("Google no pudo guardar el evento.");
          }
          await prisma.eventoReservaGoogle.upsert({
            where: {
              reservaId_conexionId: {
                reservaId: reserva.id,
                conexionId: conexion.id,
              },
            },
            create: {
              reservaId: reserva.id,
              conexionId: conexion.id,
              eventoId,
              firma,
            },
            update: { firma },
          });
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
              estado: "ERROR",
            },
          });
          return false;
        }
      }),
    );
    return resultados.every((resultado) => resultado !== false);
  }

  type EventoGoogle = {
    id?: string;
    status?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string };
    transparency?: string;
    extendedProperties?: { private?: { turnosRapidosReservaId?: string } };
  };

  async function leerCambiosGoogle(
    conexion: {
      calendarioId: string | null;
      syncToken: string | null;
    },
    accessToken: string,
  ) {
    const consultarCambios = async (syncToken: string | null) => {
      const eventos: EventoGoogle[] = [];
      let pageToken: string | undefined;
      let nextSyncToken: string | undefined;
      let zona: string | undefined;
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
        const respuesta = await consultar(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (respuesta.status === 410) return { vencido: true as const };
        if (!respuesta.ok) throw new Error("No pudimos leer el calendario.");
        const contenido = (await respuesta.json()) as {
          items?: EventoGoogle[];
          nextPageToken?: string;
          nextSyncToken?: string;
          timeZone?: string;
        };
        eventos.push(...(contenido.items ?? []));
        pageToken = contenido.nextPageToken;
        nextSyncToken = contenido.nextSyncToken ?? nextSyncToken;
        zona = contenido.timeZone ?? zona;
      } while (pageToken);
      return {
        vencido: false as const,
        eventos,
        syncToken: nextSyncToken ?? syncToken,
        completo: !syncToken,
        zona,
      };
    };

    const incremental = await consultarCambios(conexion.syncToken);
    if (!incremental.vencido) return incremental;
    return consultarCambios(null).then((resultado) => {
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
    const respuesta = await consultar("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: entorno.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret: entorno.GOOGLE_CALENDAR_CLIENT_SECRET!,
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
    const cifrado = Buffer.concat([
      cipher.update(valor, "utf8"),
      cipher.final(),
    ]);
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
    return Buffer.concat([
      decipher.update(cifrado!),
      decipher.final(),
    ]).toString("utf8");
  }
  function claveCifrado() {
    return createHash("sha256")
      .update(entorno.INTEGRATIONS_ENCRYPTION_KEY ?? secreto())
      .digest();
  }
  function secreto() {
    return entorno.BETTER_AUTH_SECRET ?? "solo-desarrollo-turnos-rapidos";
  }
  function urlWeb() {
    return entorno.WEB_URL ?? "http://localhost:3000";
  }

  async function sincronizarTurnosGoogle(conexionId: string) {
    const conexion = await prisma.conexionGoogleCalendar.findUnique({
      where: { id: conexionId },
    });
    if (!conexion || !["ACTIVA", "ERROR"].includes(conexion.estado)) return;
    let cursor: string | undefined;
    let exitoso = true;
    do {
      const reservas = await prisma.reserva.findMany({
        where: {
          negocioId: conexion.negocioId,
          ...(conexion.profesionalId
            ? { profesionalId: conexion.profesionalId }
            : {}),
          ...(conexion.sedeId ? { sedeId: conexion.sedeId } : {}),
          OR: [
            { inicio: { gt: new Date() }, estado: "CONFIRMADA" },
            { eventosGoogle: { some: { conexionId } } },
          ],
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const reserva of reservas) {
        if (!(await sincronizarReservaEnGoogle(reserva.id, conexionId)))
          exitoso = false;
      }
      cursor = reservas.length === 100 ? reservas.at(-1)?.id : undefined;
    } while (cursor);
    if (!exitoso)
      await prisma.conexionGoogleCalendar.update({
        where: { id: conexionId },
        data: {
          estado: "ERROR",
          ultimoError:
            "Algunos turnos no pudieron sincronizarse. Se reintentará automáticamente.",
        },
      });
    return exitoso;
  }
  return {
    googleCalendarConfigurado,
    crearUrlGoogleCalendar,
    leerEstadoGoogle,
    intercambiarCodigoGoogle,
    guardarConexionGoogle,
    sincronizarConexionGoogle,
    sincronizarReservaEnGoogle,
    sincronizarTurnosGoogle,
  };
}
