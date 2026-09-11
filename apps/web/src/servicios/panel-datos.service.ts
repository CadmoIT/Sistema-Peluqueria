/** Reúne las consultas del panel y garantiza que siempre estén limitadas al negocio autenticado. */
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";

export async function requerirContextoPanel() {
  const sesion = await autenticacion.api.getSession({
    headers: await headers(),
  });
  if (!sesion) redirect("/acceder?modo=ingreso");

  const membresia = await prisma.membresia.findFirst({
    where: { usuarioId: sesion.user.id, activo: true },
    include: { negocio: { include: { suscripcion: true } } },
  });
  if (!membresia) redirect("/primeros-pasos");

  return { usuario: sesion.user, membresia, negocio: membresia.negocio };
}

export async function obtenerResumenPanel() {
  const { negocio } = await requerirContextoPanel();
  const inicio = inicioDelDia(new Date());
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);

  const [reservas, clientes, profesionales, servicios, stockBajo, ingresos] =
    await Promise.all([
      prisma.reserva.findMany({
        where: { negocioId: negocio.id, inicio: { gte: inicio, lt: fin } },
        include: {
          cliente: true,
          profesional: true,
          servicios: { include: { servicio: true }, orderBy: { orden: "asc" } },
        },
        orderBy: { inicio: "asc" },
      }),
      prisma.cliente.count({ where: { negocioId: negocio.id } }),
      prisma.profesional.count({
        where: { negocioId: negocio.id, activo: true },
      }),
      prisma.servicio.count({ where: { negocioId: negocio.id, activo: true } }),
      prisma.existencia
        .count({
          where: {
            negocioId: negocio.id,
            cantidad: { lte: prisma.existencia.fields.minimo },
          },
        })
        .catch(() => 0),
      prisma.movimientoCaja.aggregate({
        where: {
          negocioId: negocio.id,
          tipo: "INGRESO",
          creadoEn: { gte: inicio, lt: fin },
        },
        _sum: { monto: true },
      }),
    ]);

  const ahora = new Date();
  const proximo = reservas.find(
    (reserva) =>
      reserva.inicio >= ahora &&
      !["CANCELADA", "VENCIDA"].includes(reserva.estado),
  );
  return {
    negocio,
    reservas,
    clientes,
    profesionales,
    servicios,
    stockBajo,
    ingresosHoy: Number(ingresos._sum.monto ?? 0),
    proximo,
  };
}

export async function obtenerAgenda() {
  const { negocio } = await requerirContextoPanel();
  const desde = new Date();
  desde.setDate(desde.getDate() - 45);
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + 180);
  const [reservas, bloqueos, sedes, profesionales, servicios, clientes] =
    await Promise.all([
      prisma.reserva.findMany({
        where: { negocioId: negocio.id, inicio: { gte: desde, lte: hasta } },
        include: {
          cliente: true,
          profesional: true,
          sede: true,
          servicios: { include: { servicio: true } },
        },
      }),
      prisma.eventoCalendarioExterno.findMany({
        where: {
          conexion: { negocioId: negocio.id },
          cancelado: false,
          inicio: { gte: desde, lte: hasta },
        },
        include: { conexion: true },
      }),
      prisma.sede.findMany({
        where: { negocioId: negocio.id, activa: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.profesional.findMany({
        where: { negocioId: negocio.id, activo: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.servicio.findMany({
        where: { negocioId: negocio.id, activo: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.cliente.findMany({
        where: { negocioId: negocio.id },
        orderBy: { creadoEn: "desc" },
        take: 100,
      }),
    ]);
  return {
    negocio,
    reservas,
    bloqueos,
    sedes,
    profesionales,
    servicios,
    clientes,
  };
}

export async function obtenerClientes() {
  const { negocio } = await requerirContextoPanel();
  const clientes = await prisma.cliente.findMany({
    where: { negocioId: negocio.id },
    include: {
      reservas: {
        select: { inicio: true },
        orderBy: { inicio: "desc" },
        take: 1,
      },
      _count: { select: { reservas: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  return { negocio, clientes };
}

export async function obtenerCatalogo() {
  const { negocio } = await requerirContextoPanel();
  const [servicios, categorias, profesionales, sedes] = await Promise.all([
    prisma.servicio.findMany({
      where: { negocioId: negocio.id },
      include: {
        categoria: true,
        profesionales: { include: { profesional: true } },
        sedes: { include: { sede: true } },
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.categoriaServicio.findMany({
      where: { negocioId: negocio.id },
      orderBy: { orden: "asc" },
    }),
    prisma.profesional.findMany({
      where: { negocioId: negocio.id, activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  return { negocio, servicios, categorias, profesionales, sedes };
}

export async function obtenerEquipo() {
  const { negocio } = await requerirContextoPanel();
  const [profesionales, sedes, servicios, conexiones] = await Promise.all([
    prisma.profesional.findMany({
      where: { negocioId: negocio.id },
      include: {
        sedes: { include: { sede: true } },
        servicios: { include: { servicio: true } },
        horarios: true,
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.sede.findMany({ where: { negocioId: negocio.id, activa: true } }),
    prisma.servicio.findMany({
      where: { negocioId: negocio.id, activo: true },
    }),
    prisma.conexionGoogleCalendar.findMany({
      where: { negocioId: negocio.id },
    }),
  ]);
  return { negocio, profesionales, sedes, servicios, conexiones };
}

export async function obtenerSitioEditable() {
  const { negocio } = await requerirContextoPanel();
  const [configuracion, sedes, servicios, profesionales] = await Promise.all([
    prisma.configuracionSitio.findUnique({ where: { negocioId: negocio.id } }),
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      include: { horarios: true },
    }),
    prisma.servicio.findMany({
      where: { negocioId: negocio.id, activo: true },
      include: { categoria: true },
    }),
    prisma.profesional.findMany({
      where: { negocioId: negocio.id, activo: true },
    }),
  ]);
  return { negocio, configuracion, sedes, servicios, profesionales };
}

export async function obtenerConfiguracionNegocio() {
  const contexto = await requerirContextoPanel();
  const sedes = await prisma.sede.findMany({
    where: { negocioId: contexto.negocio.id },
    orderBy: { nombre: "asc" },
  });
  return { ...contexto, sedes };
}

export async function obtenerInventario() {
  const { negocio } = await requerirContextoPanel();
  const [productos, sedes] = await Promise.all([
    prisma.producto.findMany({
      where: { negocioId: negocio.id },
      include: { existencias: { include: { sede: true } } },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  return { negocio, productos, sedes };
}

export async function obtenerCaja() {
  const { negocio } = await requerirContextoPanel();
  const inicio = inicioDelDia(new Date());
  const [servicios, productos, movimientos, sedes] = await Promise.all([
    prisma.servicio.findMany({
      where: { negocioId: negocio.id, activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.producto.findMany({
      where: { negocioId: negocio.id, activo: true },
      include: { existencias: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.movimientoCaja.findMany({
      where: { negocioId: negocio.id, creadoEn: { gte: inicio } },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.sede.findMany({ where: { negocioId: negocio.id, activa: true } }),
  ]);
  return { negocio, servicios, productos, movimientos, sedes };
}

export async function obtenerReportes(desde?: Date) {
  const { negocio } = await requerirContextoPanel();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const movimientos = await prisma.movimientoCaja.findMany({
    where: { negocioId: negocio.id, creadoEn: { gte: desde ?? inicioMes } },
    orderBy: { creadoEn: "asc" },
  });
  return { negocio, movimientos };
}

export async function obtenerSitioPublico(slug: string) {
  return prisma.negocio.findUnique({
    where: { slug },
    include: {
      suscripcion: true,
      configuracionSitio: true,
      sedes: { where: { activa: true }, include: { horarios: true } },
      servicios: {
        where: { activo: true },
        include: {
          categoria: true,
          sedes: true,
          profesionales: true,
        },
      },
      profesionales: {
        where: { activo: true },
        include: {
          sedes: true,
          servicios: true,
        },
      },
    },
  });
}

function inicioDelDia(fecha: Date) {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}
