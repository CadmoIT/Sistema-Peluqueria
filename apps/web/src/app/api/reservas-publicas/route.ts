/** Valida y crea reservas públicas para el negocio resuelto por slug. */
import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { Prisma, type Cliente } from "@prisma/client";
import { sincronizarReservaEnGoogle } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { estaDentroDelHorario } from "@/servicios/disponibilidad.service";

type Entrada = {
  slug?: string;
  servicioId?: string;
  servicioIds?: string[];
  sedeId?: string;
  profesionalId?: string;
  inicio?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  aceptaWhatsapp?: boolean;
  observacion?: string;
};

export async function POST(solicitud: Request) {
  const entrada = (await solicitud.json().catch(() => null)) as Entrada | null;
  const servicioIds = Array.from(
    new Set(
      (entrada?.servicioIds?.length
        ? entrada.servicioIds
        : entrada?.servicioId
          ? [entrada.servicioId]
          : []
      ).filter(Boolean),
    ),
  );
  if (
    !entrada?.slug ||
    !servicioIds.length ||
    !entrada.sedeId ||
    !entrada.profesionalId ||
    !entrada.inicio
  )
    return respuesta("Faltan datos para crear el turno.", 400);
  const negocio = await prisma.negocio.findFirst({
    where: {
      OR: [
        { slug: entrada.slug },
        { sedes: { some: { subdominio: entrada.slug, activa: true } } },
      ],
    },
    select: {
      id: true,
      publicado: true,
      politicaContacto: true,
      zonaHoraria: true,
      suscripcion: {
        select: { estado: true, pruebaFinalizaEn: true, graciaHasta: true },
      },
    },
  });
  if (!negocio || !negocio.publicado)
    return respuesta("Este sitio no está disponible.", 404);
  if (
    negocio.suscripcion?.estado === "PAUSADA" ||
    negocio.suscripcion?.estado === "CANCELADA" ||
    (negocio.suscripcion?.estado === "EN_GRACIA" &&
      negocio.suscripcion.graciaHasta &&
      negocio.suscripcion.graciaHasta < new Date()) ||
    (negocio.suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
      negocio.suscripcion.pruebaFinalizaEn &&
      negocio.suscripcion.pruebaFinalizaEn < new Date())
  )
    return respuesta("La prueba de este negocio finalizó.", 403);
  const nombre = limpiar(entrada.nombre);
  const apellido = limpiar(entrada.apellido);
  const email = limpiar(entrada.email)?.toLowerCase() ?? null;
  const telefono = limpiar(entrada.telefono)?.replace(/[^+\d]/g, "") ?? null;
  const aceptaWhatsapp = entrada.aceptaWhatsapp === true && Boolean(telefono);
  const observacion = limpiar(entrada.observacion)?.slice(0, 500) ?? null;
  if (negocio.politicaContacto === "EMAIL" && !email)
    return respuesta("Ingresá tu correo para reservar.", 400);
  if (negocio.politicaContacto === "TELEFONO" && !telefono)
    return respuesta("Ingresá tu teléfono para reservar.", 400);
  if (negocio.politicaContacto === "CUALQUIERA" && !email && !telefono)
    return respuesta("Ingresá un correo o teléfono para reservar.", 400);
  const [servicios, profesional, sede] = await Promise.all([
    prisma.servicio.findMany({
      where: {
        id: { in: servicioIds },
        negocioId: negocio.id,
        activo: true,
        sedes: { some: { sedeId: entrada.sedeId } },
        profesionales: { some: { profesionalId: entrada.profesionalId } },
      },
      select: {
        id: true,
        duracionMinutos: true,
        bufferMinutos: true,
        precio: true,
      },
    }),
    prisma.profesional.findFirst({
      where: {
        id: entrada.profesionalId,
        negocioId: negocio.id,
        activo: true,
        sedes: { some: { sedeId: entrada.sedeId } },
        servicios: { some: { servicioId: { in: servicioIds } } },
      },
      select: {
        id: true,
        horarios: {
          where: { sedeId: entrada.sedeId },
          select: { diaSemana: true, comienza: true, termina: true },
        },
      },
    }),
    prisma.sede.findFirst({
      where: { id: entrada.sedeId, negocioId: negocio.id, activa: true },
      select: { id: true },
    }),
  ]);
  const inicio = new Date(entrada.inicio);
  if (
    servicios.length !== servicioIds.length ||
    !profesional ||
    !sede ||
    Number.isNaN(inicio.getTime()) ||
    inicio < new Date()
  )
    return respuesta("La selección ya no está disponible.", 400);
  const fin = new Date(
    inicio.getTime() +
      servicios.reduce(
        (total, servicio) =>
          total + servicio.duracionMinutos + servicio.bufferMinutos,
        0,
      ) *
        60_000,
  );
  if (
    !estaDentroDelHorario(
      inicio,
      fin,
      profesional.horarios,
      negocio.zonaHoraria,
    )
  ) {
    return respuesta(
      "El horario está fuera de la jornada del profesional.",
      400,
    );
  }
  try {
    const reserva = await prisma.$transaction(
      async (tx) => {
        const ocupada = await tx.reserva.findFirst({
          where: {
            negocioId: negocio.id,
            profesionalId: profesional.id,
            estado: { notIn: ["CANCELADA", "VENCIDA"] },
            inicio: { lt: fin },
            fin: { gt: inicio },
          },
        });
        const bloqueo = await tx.eventoCalendarioExterno.findFirst({
          where: {
            cancelado: false,
            conexion: {
              negocioId: negocio.id,
              OR: [
                { profesionalId: profesional.id },
                { profesionalId: null, sedeId: sede.id },
                { profesionalId: null, sedeId: null },
              ],
            },
            inicio: { lt: fin },
            fin: { gt: inicio },
          },
        });
        const bloqueoInterno = await tx.bloqueoAgenda.findFirst({
          where: {
            negocioId: negocio.id,
            profesionalId: profesional.id,
            inicio: { lt: fin },
            fin: { gt: inicio },
          },
        });
        if (ocupada || bloqueo || bloqueoInterno) {
          throw new Error("HORARIO_OCUPADO");
        }
        let existente =
          email || telefono
            ? await tx.cliente.findFirst({
                where: {
                  negocioId: negocio.id,
                  OR: [
                    ...(email ? [{ email }] : []),
                    ...(telefono ? [{ telefono }] : []),
                  ],
                },
              })
            : null;
        if (!existente && (email || telefono)) {
          const coincidencias = await tx.$queryRaw<Cliente[]>(Prisma.sql`
            SELECT * FROM "Cliente" WHERE "negocioId" = ${negocio.id} AND (
              ${email ? Prisma.sql`LOWER(TRIM("email")) = ${email}` : Prisma.sql`FALSE`}
              OR ${telefono ? Prisma.sql`regexp_replace("telefono", '[^+0-9]', '', 'g') = ${telefono}` : Prisma.sql`FALSE`}
            ) ORDER BY "creadoEn" ASC LIMIT 1
          `);
          existente = coincidencias[0] ?? null;
        }
        const cliente = existente
          ? await tx.cliente.update({
              where: { id: existente.id },
              data: {
                nombre: nombre ?? existente.nombre,
                apellido: apellido ?? existente.apellido,
                email: email ?? existente.email,
                telefono: telefono ?? existente.telefono,
                aceptaWhatsapp,
                consentimientoWhatsappEn: aceptaWhatsapp ? new Date() : null,
              },
            })
          : await tx.cliente.create({
              data: {
                negocioId: negocio.id,
                nombre,
                apellido,
                email,
                telefono,
                aceptaWhatsapp,
                consentimientoWhatsappEn: aceptaWhatsapp ? new Date() : null,
              },
            });
        return tx.reserva.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            profesionalId: profesional.id,
            clienteId: cliente.id,
            codigo: randomUUID().slice(0, 8).toUpperCase(),
            estado: "CONFIRMADA",
            inicio,
            fin,
            total: servicios.reduce(
              (total, servicio) => total + Number(servicio.precio),
              0,
            ),
            sena: new Prisma.Decimal(0),
            notas: observacion,
            servicios: {
              create: servicios.map((servicio, indice) => ({
                servicioId: servicio.id,
                orden: indice + 1,
                precio: servicio.precio,
                duracionMinutos: servicio.duracionMinutos,
              })),
            },
          },
          select: { id: true, codigo: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    after(() => sincronizarReservaEnGoogle(reserva.id));
    return NextResponse.json({ codigo: reserva.codigo }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "HORARIO_OCUPADO")
      return respuesta("Ese horario acaba de ocuparse. Elegí otro.", 409);
    return respuesta("No pudimos confirmar el turno.", 500);
  }
}
function limpiar(valor?: string) {
  const resultado = valor?.trim();
  return resultado || null;
}
function respuesta(mensaje: string, estado: number) {
  return NextResponse.json({ mensaje }, { status: estado });
}
