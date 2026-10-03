/** Datos efímeros, exclusivamente en un esquema local aislado. No entrega correos. */
import { randomUUID } from "node:crypto";
import { PrismaClient, type Usuario, type Profesional } from "@prisma/client";
import type { ContextoEquipo } from "../src/servicios/contexto-equipo.service";
export function comprobarBaseEquipo() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.PRUEBAS_EQUIPO !== "1" ||
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^equipo_prueba_[a-z0-9_]+$/.test(url.searchParams.get("schema") ?? "")
  )
    throw new Error(
      "Se requiere autorización y un esquema equipo_prueba_* en PostgreSQL local.",
    );
}
export async function crearEquipoPrueba(db: PrismaClient) {
  comprobarBaseEquipo();
  const sufijo = randomUUID();
  const negocio = await db.negocio.create({
    data: {
      nombre: "Barbería de prueba",
      slug: `equipo-${sufijo}`,
      publicado: true,
      suscripcion: {
        create: {
          precioMensual: 0,
          plan: "PRUEBA",
          estado: "CONFIGURACION_GRATUITA",
          pruebaFinalizaEn: new Date(Date.now() + 7 * 86400000),
        },
      },
    },
  });
  const otro = await db.negocio.create({
    data: { nombre: "Otro negocio", slug: `otro-${sufijo}` },
  });
  const dueno = await db.usuario.create({
    data: {
      nombre: "Dueño de prueba",
      email: `dueno-${sufijo}@example.com`,
      emailVerificado: true,
    },
  });
  const admin = await db.usuario.create({
    data: {
      nombre: "Administrador",
      email: `admin-${sufijo}@example.com`,
      emailVerificado: true,
    },
  });
  await db.membresia.createMany({
    data: [
      { usuarioId: dueno.id, negocioId: negocio.id, rol: "DUENO" },
      { usuarioId: admin.id, negocioId: negocio.id, rol: "ADMINISTRADOR" },
      {
        usuarioId: dueno.id,
        negocioId: otro.id,
        rol: "PROFESIONAL",
        aceptadaEn: new Date(),
      },
    ],
  });
  const sedes = await Promise.all(
    ["Centro", "Norte"].map((nombre) =>
      db.sede.create({
        data: {
          negocioId: negocio.id,
          nombre,
          direccion: "Dirección ficticia",
          horarios: {
            create: Array.from({ length: 7 }, (_, diaSemana) => ({
              negocioId: negocio.id,
              diaSemana,
              abre: "08:00",
              cierra: "20:00",
            })),
          },
        },
      }),
    ),
  );
  const empleados: Array<{ usuario: Usuario; profesional: Profesional }> = [];
  for (let n = 0; n < 5; n++) {
    const usuario = await db.usuario.create({
      data: {
        nombre: `Barbero ${n + 1}`,
        email: `empleado${n}-${sufijo}@example.com`,
        emailVerificado: true,
      },
    });
    const profesional = await db.profesional.create({
      data: {
        negocioId: negocio.id,
        nombre: usuario.nombre,
        sedes: {
          create: [
            { sedeId: sedes[0]!.id },
            ...(n === 0 ? [{ sedeId: sedes[1]!.id }] : []),
          ],
        },
      },
    });
    empleados.push({ usuario, profesional });
  }
  const servicio = await db.servicio.create({
    data: {
      negocioId: negocio.id,
      nombre: "Corte",
      precio: 1000,
      duracionMinutos: 30,
      profesionales: {
        create: empleados.map((e) => ({ profesionalId: e.profesional.id })),
      },
      sedes: { create: sedes.map((s) => ({ sedeId: s.id })) },
    },
  });
  const producto = await db.producto.create({
    data: {
      negocioId: negocio.id,
      nombre: "Cera",
      precio: 400,
      costo: 100,
      existencias: {
        create: sedes.map((s) => ({
          negocioId: negocio.id,
          sedeId: s.id,
          cantidad: 10,
        })),
      },
    },
  });
  const clientes = await Promise.all(
    [0, 1, 2].map((n) =>
      db.cliente.create({
        data: {
          negocioId: negocio.id,
          nombre: `Cliente ${n}`,
          email: `cliente${n}-${sufijo}@example.com`,
          notas: `Nota histórica privada ${n}`,
        },
      }),
    ),
  );
  const reserva = await db.reserva.create({
    data: {
      negocioId: negocio.id,
      sedeId: sedes[0]!.id,
      profesionalId: empleados[0]!.profesional.id,
      clienteId: clientes[0]!.id,
      codigo: `T-${sufijo.slice(0, 8)}`,
      inicio: new Date("2040-01-02T15:00Z"),
      fin: new Date("2040-01-02T15:30Z"),
      total: 1000,
      sena: 200,
      estado: "CONFIRMADA",
      servicios: {
        create: {
          servicioId: servicio.id,
          precio: 1000,
          duracionMinutos: 30,
          orden: 1,
        },
      },
    },
  });
  await db.pago.create({
    data: {
      negocioId: negocio.id,
      reservaId: reserva.id,
      idempotencia: `pago-${sufijo}`,
      proveedor: "prueba-local",
      proveedorId: `pago-${sufijo}`,
      monto: 200,
      estado: "APROBADO",
      pagadoEn: new Date(),
    },
  });
  await db.profesionalCliente.createMany({
    data: [
      {
        profesionalId: empleados[0]!.profesional.id,
        clienteId: clientes[0]!.id,
        notas: "Nota del barbero 1",
      },
      {
        profesionalId: empleados[1]!.profesional.id,
        clienteId: clientes[0]!.id,
        notas: "Nota del barbero 2",
      },
      {
        profesionalId: empleados[1]!.profesional.id,
        clienteId: clientes[1]!.id,
      },
    ],
  });
  const contexto = async (usuarioId: string, negocioId = negocio.id) => {
    const usuario = await db.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });
    const membresia = await db.membresia.findUniqueOrThrow({
      where: { usuarioId_negocioId: { usuarioId, negocioId } },
      include: {
        negocio: { include: { suscripcion: true } },
        profesional: { include: { sedes: true } },
      },
    });
    return {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.nombre,
        emailVerified: usuario.emailVerificado,
      },
      membresia,
      negocio: membresia.negocio,
      identidad: {
        rol: membresia.rol,
        profesionalId: membresia.profesional?.id ?? null,
        sedeIds: membresia.profesional?.sedes.map((s) => s.sedeId) ?? [],
      },
    } satisfies ContextoEquipo;
  };
  const vincular = async (indice: number) => {
    const e = empleados[indice]!;
    const m = await db.membresia.create({
      data: {
        negocioId: negocio.id,
        usuarioId: e.usuario.id,
        rol: "PROFESIONAL",
        aceptadaEn: new Date(),
      },
    });
    await db.profesional.update({
      where: { id: e.profesional.id },
      data: { membresiaId: m.id },
    });
    return contexto(e.usuario.id);
  };
  return {
    negocio,
    otro,
    dueno,
    admin,
    sedes,
    empleados,
    servicio,
    producto,
    clientes,
    reserva,
    contexto,
    vincular,
    async limpiar() {
      const invitaciones = await db.invitacionEquipo.findMany({
        where: { negocioId: { in: [negocio.id, otro.id] } },
        select: { correoClave: true },
      });
      await db.correoPendiente.deleteMany({
        where: {
          claveIdempotencia: { in: invitaciones.map((i) => i.correoClave) },
        },
      });
      await db.invitacionEquipo.deleteMany({
        where: { negocioId: { in: [negocio.id, otro.id] } },
      });
      await db.cobroReserva.deleteMany({
        where: { negocioId: { in: [negocio.id, otro.id] } },
      });
      await db.reserva.deleteMany({
        where: { negocioId: { in: [negocio.id, otro.id] } },
      });
      await db.negocio.deleteMany({
        where: { id: { in: [negocio.id, otro.id] } },
      });
      await db.usuario.deleteMany({
        where: {
          id: {
            in: [dueno.id, admin.id, ...empleados.map((e) => e.usuario.id)],
          },
        },
      });
    },
  };
}
