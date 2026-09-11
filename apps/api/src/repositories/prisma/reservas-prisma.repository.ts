/** Persiste retenciones y confirmaciones de reservas públicas en PostgreSQL. */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Reserva } from "../../domain/entities/reserva.entity";
import type { CrearReservaDto } from "../../dto/reservas/crear-reserva.dto";
import type { ReservasRepository } from "../contracts/reservas.repository";
import { PrismaService } from "../../services/prisma.service";

@Injectable()
export class ReservasPrismaRepository implements ReservasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async guardar(reserva: Reserva) {
    const existente = await this.prisma.reserva.findUnique({
      where: { id: reserva.id },
    });
    if (existente) {
      await this.prisma.reserva.update({
        where: { id: reserva.id },
        data: { estado: reserva.estado },
      });
      return;
    }
    await this.crearRetencion(reserva);
  }

  async buscarPorId(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        negocio: true,
        cliente: true,
        servicios: { orderBy: { orden: "asc" } },
      },
    });
    if (!reserva) return null;
    return Reserva.retenida({
      id: reserva.id,
      codigo: reserva.codigo,
      claveHorario: crearClaveHorario({
        negocioSlug: reserva.negocio.slug,
        sedeId: reserva.sedeId,
        profesionalId: reserva.profesionalId,
        inicio: reserva.inicio.toISOString(),
      }),
      venceEn: (reserva.retenidaHasta ?? reserva.fin).toISOString(),
      datos: {
        negocioSlug: reserva.negocio.slug,
        sedeId: reserva.sedeId,
        profesionalId: reserva.profesionalId,
        servicioIds: reserva.servicios.map((item) => item.servicioId),
        inicio: reserva.inicio.toISOString(),
        cliente: {
          nombre: reserva.cliente.nombre ?? "",
          email: reserva.cliente.email ?? "",
          telefono: reserva.cliente.telefono ?? "",
        },
      },
      estado: reserva.estado === "CONFIRMADA" ? "CONFIRMADA" : "RETENIDA",
    });
  }

  async existeHorario(claveHorario: string) {
    const clave = JSON.parse(claveHorario) as {
      negocioSlug: string;
      profesionalId: string;
      inicio: string;
    };
    return Boolean(
      await this.prisma.reserva.findFirst({
        where: {
          negocio: { slug: clave.negocioSlug },
          profesionalId: clave.profesionalId,
          inicio: new Date(clave.inicio),
          estado: { notIn: ["CANCELADA", "VENCIDA"] },
        },
      }),
    );
  }

  async listarRetenidas() {
    const ids = await this.prisma.reserva.findMany({
      where: { estado: "RETENIDA" },
      select: { id: true },
    });
    const reservas = await Promise.all(
      ids.map(({ id }) => this.buscarPorId(id)),
    );
    return reservas.filter((reserva): reserva is Reserva => Boolean(reserva));
  }

  async eliminar(id: string) {
    await this.prisma.reserva.updateMany({
      where: { id, estado: "RETENIDA" },
      data: { estado: "VENCIDA", retenidaHasta: null },
    });
  }

  private async crearRetencion(reserva: Reserva) {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const negocio = await tx.negocio.findFirst({
            where: { slug: reserva.datos.negocioSlug, publicado: true },
            include: { suscripcion: true },
          });
          if (!negocio)
            throw new NotFoundException("El negocio no está disponible.");
          const pruebaVencida =
            negocio.suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
            negocio.suscripcion.pruebaFinalizaEn &&
            negocio.suscripcion.pruebaFinalizaEn < new Date();
          const graciaVencida =
            negocio.suscripcion?.estado === "EN_GRACIA" &&
            negocio.suscripcion.graciaHasta &&
            negocio.suscripcion.graciaHasta < new Date();
          if (
            pruebaVencida ||
            graciaVencida ||
            ["PAUSADA", "CANCELADA"].includes(negocio.suscripcion?.estado ?? "")
          ) {
            throw new NotFoundException(
              "El sitio no está recibiendo reservas.",
            );
          }
          validarContacto(
            negocio.politicaContacto,
            reserva.datos.cliente.email,
            reserva.datos.cliente.telefono,
          );
          const inicio = new Date(reserva.datos.inicio);
          const servicios = await tx.servicio.findMany({
            where: {
              id: { in: reserva.datos.servicioIds },
              negocioId: negocio.id,
              activo: true,
              sedes: { some: { sedeId: reserva.datos.sedeId } },
              profesionales: {
                some: { profesionalId: reserva.datos.profesionalId },
              },
            },
          });
          if (servicios.length !== reserva.datos.servicioIds.length) {
            throw new NotFoundException(
              "Uno de los servicios no está disponible.",
            );
          }
          const minutos = servicios.reduce(
            (total, servicio) =>
              total + servicio.duracionMinutos + servicio.bufferMinutos,
            0,
          );
          const fin = new Date(inicio.getTime() + minutos * 60_000);
          const ocupada = await tx.reserva.findFirst({
            where: {
              negocioId: negocio.id,
              profesionalId: reserva.datos.profesionalId,
              estado: { notIn: ["CANCELADA", "VENCIDA"] },
              inicio: { lt: fin },
              fin: { gt: inicio },
            },
          });
          if (ocupada)
            throw new ConflictException("El horario acaba de ocuparse.");

          const email = limpiar(reserva.datos.cliente.email)?.toLowerCase();
          const telefono = limpiar(reserva.datos.cliente.telefono)?.replace(
            /[^+\d]/g,
            "",
          );
          const clienteExistente =
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
          const cliente = clienteExistente
            ? await tx.cliente.update({
                where: { id: clienteExistente.id },
                data: {
                  nombre:
                    limpiar(reserva.datos.cliente.nombre) ??
                    clienteExistente.nombre,
                  email: email ?? clienteExistente.email,
                  telefono: telefono ?? clienteExistente.telefono,
                },
              })
            : await tx.cliente.create({
                data: {
                  negocioId: negocio.id,
                  nombre: limpiar(reserva.datos.cliente.nombre),
                  email,
                  telefono,
                },
              });
          const total = servicios.reduce(
            (suma, servicio) => suma.plus(servicio.precio),
            new Prisma.Decimal(0),
          );
          await tx.reserva.create({
            data: {
              id: reserva.id,
              negocioId: negocio.id,
              sedeId: reserva.datos.sedeId,
              profesionalId: reserva.datos.profesionalId,
              clienteId: cliente.id,
              codigo: reserva.codigo,
              estado: "RETENIDA",
              inicio,
              fin,
              retenidaHasta: new Date(reserva.venceEn),
              total,
              sena: 0,
              servicios: {
                create: reserva.datos.servicioIds.map((servicioId, orden) => {
                  const servicio = servicios.find(
                    (item) => item.id === servicioId,
                  )!;
                  return {
                    servicioId,
                    orden: orden + 1,
                    precio: servicio.precio,
                    duracionMinutos: servicio.duracionMinutos,
                  };
                }),
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException("El horario acaba de ocuparse.");
      }
      throw error;
    }
  }
}

function crearClaveHorario(datos: {
  negocioSlug: string;
  sedeId: string;
  profesionalId: string;
  inicio: string;
}) {
  return JSON.stringify(datos);
}

function limpiar(valor?: string) {
  return valor?.trim() || null;
}

function validarContacto(
  politica: "EMAIL" | "TELEFONO" | "CUALQUIERA" | "NINGUNO",
  email?: string,
  telefono?: string,
) {
  if (politica === "EMAIL" && !limpiar(email)) {
    throw new BadRequestException("Ingresá un correo para reservar.");
  }
  if (politica === "TELEFONO" && !limpiar(telefono)) {
    throw new BadRequestException("Ingresá un teléfono para reservar.");
  }
  if (politica === "CUALQUIERA" && !limpiar(email) && !limpiar(telefono)) {
    throw new BadRequestException(
      "Ingresá un correo o teléfono para reservar.",
    );
  }
}
