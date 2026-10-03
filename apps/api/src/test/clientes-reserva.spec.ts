/** Comprueba la compatibilidad de clientes por reserva en Nest sin consultar servicios externos. */
import { Prisma } from "@prisma/client";
import { Reserva } from "../domain/entities/reserva.entity";
import { ReservasPrismaRepository } from "../repositories/prisma/reservas-prisma.repository";
import { PrismaService } from "../services/prisma.service";

test.each([false, true])(
  "reutiliza al cliente conservando historial, con formato antiguo: %s",
  async (antiguo) => {
    const cliente = {
      id: "cliente",
      nombre: "Nombre anterior",
      email: "cliente@ejemplo.com",
      telefono: null,
      archivadoEn: new Date(),
      notas: "No borrar",
    };
    const tx = {
      negocio: {
        findFirst: jest.fn().mockResolvedValue({
          id: "negocio",
          politicaContacto: "EMAIL",
          zonaHoraria: "America/Argentina/Buenos_Aires",
          suscripcion: {
            estado: "ACTIVA",
            proximoCobro: new Date("2031-01-01"),
          },
        }),
      },
      servicio: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "servicio",
            duracionMinutos: 30,
            bufferMinutos: 0,
            precio: new Prisma.Decimal(5000),
          },
        ]),
      },
      reserva: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      profesional: {
        findFirst: jest.fn().mockResolvedValue({
          id: "profesional",
          horarios: Array.from({ length: 7 }, (_, diaSemana) => ({
            diaSemana,
            comienza: "00:00",
            termina: "23:59",
          })),
        }),
      },
      sede: {
        findFirst: jest.fn().mockResolvedValue({
          id: "local",
          horarios: Array.from({ length: 7 }, (_, diaSemana) => ({
            diaSemana,
            abre: "00:00",
            cierra: "23:59",
          })),
        }),
      },
      bloqueoAgenda: { count: jest.fn().mockResolvedValue(0) },
      eventoCalendarioExterno: { count: jest.fn().mockResolvedValue(0) },
      cliente: {
        findFirst: jest.fn().mockResolvedValue(antiguo ? null : cliente),
        update: jest.fn().mockResolvedValue(cliente),
        create: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([cliente]),
    };
    const db = {
      reserva: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (accion: (contexto: typeof tx) => Promise<unknown>) => accion(tx),
      ),
    };
    const repository = new ReservasPrismaRepository(
      db as unknown as PrismaService,
    );
    await repository.guardar(
      Reserva.retenida({
        id: "reserva",
        codigo: "PRUEBA",
        claveHorario: "clave",
        venceEn: "2030-01-01T12:00:00Z",
        datos: {
          negocioSlug: "negocio",
          sedeId: "local",
          profesionalId: "profesional",
          servicioIds: ["servicio"],
          inicio: "2030-01-01T11:00:00Z",
          cliente: { email: "CLIENTE@EJEMPLO.COM" },
        },
      }),
    );
    expect(tx.cliente.update).toHaveBeenCalledWith({
      where: { id: "cliente" },
      data: {
        nombre: "Nombre anterior",
        email: "cliente@ejemplo.com",
        telefono: null,
      },
    });
    expect(tx.cliente.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.reserva.create.mock.calls[0][0].data.clienteId).toBe("cliente");
  },
);
