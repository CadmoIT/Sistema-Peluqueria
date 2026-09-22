/** Reúne las consultas del panel y garantiza que siempre estén limitadas al negocio autenticado. */
import "server-only";

import { cache } from "react";
import { periodoReporte, rangoReporte } from "@/lib/reportes-movimientos";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import {
  fechaEnZona as fechaEnZonaAgenda,
  fechaValida,
} from "@/componentes/panel/agenda/agenda-modelo";
import { fechaLocalAUtc, sumarDias } from "./disponibilidad.service";

export const requerirContextoPanel = cache(
  async function requerirContextoPanel() {
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
  },
);

export async function obtenerResumenPanel() {
  const { negocio } = await requerirContextoPanel();
  const fechaLocal = fechaEnZona(new Date(), negocio.zonaHoraria);
  const inicio = fechaLocalAUtc(fechaLocal, "00:00", negocio.zonaHoraria);
  const fin = fechaLocalAUtc(
    sumarDias(fechaLocal, 1),
    "00:00",
    negocio.zonaHoraria,
  );

  const [
    reservas,
    turnosHoy,
    proximo,
    clientes,
    profesionales,
    servicios,
    ingresos,
  ] = await Promise.all([
    prisma.reserva.findMany({
      where: { negocioId: negocio.id, inicio: { gte: inicio, lt: fin } },
      select: {
        id: true,
        inicio: true,
        estado: true,
        cliente: {
          select: { nombre: true, apellido: true, email: true, telefono: true },
        },
        profesional: { select: { nombre: true, apellido: true } },
        servicios: {
          select: { servicio: { select: { nombre: true } } },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { inicio: "asc" },
      take: 6,
    }),
    prisma.reserva.count({
      where: {
        negocioId: negocio.id,
        inicio: { gte: inicio, lt: fin },
        estado: { notIn: ["CANCELADA", "VENCIDA"] },
      },
    }),
    prisma.reserva.findFirst({
      where: {
        negocioId: negocio.id,
        inicio: { gte: new Date() },
        estado: { notIn: ["CANCELADA", "VENCIDA"] },
      },
      select: { inicio: true },
      orderBy: { inicio: "asc" },
    }),
    prisma.cliente.count({
      where: { negocioId: negocio.id },
    }),
    prisma.profesional.count({
      where: { negocioId: negocio.id, activo: true },
    }),
    prisma.servicio.count({ where: { negocioId: negocio.id, activo: true } }),
    prisma.movimientoCaja.aggregate({
      where: {
        negocioId: negocio.id,
        tipo: "INGRESO",
        creadoEn: { gte: inicio, lt: fin },
      },
      _sum: { monto: true },
    }),
  ]);

  return {
    negocio,
    reservas,
    turnosHoy,
    clientes,
    profesionales,
    servicios,
    ingresosHoy: Number(ingresos._sum.monto ?? 0),
    proximo,
  };
}

export async function obtenerAgenda(fechaSolicitada?: string) {
  const { negocio } = await requerirContextoPanel();
  const fecha = fechaValida(fechaSolicitada)
    ? fechaSolicitada
    : fechaEnZonaAgenda(new Date(), negocio.zonaHoraria);
  const desde = fechaLocalAUtc(fecha, "00:00", negocio.zonaHoraria);
  const hasta = fechaLocalAUtc(
    sumarDias(fecha, 1),
    "00:00",
    negocio.zonaHoraria,
  );
  const [
    reservas,
    bloqueos,
    sedes,
    profesionales,
    servicios,
    clientes,
    conexionesGoogle,
    bloqueosInternos,
  ] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        negocioId: negocio.id,
        inicio: { lt: hasta },
        fin: { gt: desde },
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        estado: true,
        notas: true,
        profesionalId: true,
        sedeId: true,
        cliente: {
          select: { nombre: true, apellido: true, email: true, telefono: true },
        },
        profesional: { select: { nombre: true, apellido: true } },
        sede: { select: { nombre: true } },
        servicios: {
          select: { servicio: { select: { nombre: true } } },
          orderBy: { orden: "asc" },
        },
      },
    }),
    prisma.eventoCalendarioExterno.findMany({
      where: {
        conexion: { negocioId: negocio.id },
        cancelado: false,
        inicio: { lt: hasta },
        fin: { gt: desde },
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        conexion: {
          select: { nombre: true, profesionalId: true, sedeId: true },
        },
      },
    }),
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      select: {
        id: true,
        nombre: true,
        horarios: {
          select: { diaSemana: true, abre: true, cierra: true, activo: true },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.profesional.findMany({
      where: { negocioId: negocio.id, activo: true },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        horarios: {
          select: {
            sedeId: true,
            diaSemana: true,
            comienza: true,
            termina: true,
          },
        },
        sedes: { select: { sedeId: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.servicio.findMany({
      where: { negocioId: negocio.id, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.cliente.findMany({
      where: { negocioId: negocio.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
      },
      orderBy: { creadoEn: "desc" },
      take: 100,
    }),
    prisma.conexionGoogleCalendar.findMany({
      where: { negocioId: negocio.id },
      select: {
        id: true,
        estado: true,
        nombre: true,
        ultimoError: true,
        sincronizadoEn: true,
        sedeId: true,
        profesionalId: true,
      },
    }),
    prisma.bloqueoAgenda.findMany({
      where: {
        negocioId: negocio.id,
        inicio: { lt: hasta },
        fin: { gt: desde },
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        motivo: true,
        profesionalId: true,
        profesional: { select: { nombre: true } },
      },
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
    conexionesGoogle,
    bloqueosInternos,
    fecha,
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
  const [sedes, conexionesGoogle, configuracionAvisos] = await Promise.all([
    prisma.sede.findMany({
      where: { negocioId: contexto.negocio.id },
      include: { horarios: { orderBy: { diaSemana: "asc" } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.conexionGoogleCalendar.findMany({
      where: { negocioId: contexto.negocio.id },
      orderBy: { actualizadoEn: "desc" },
    }),
    prisma.configuracionAvisos.findUnique({
      where: { negocioId: contexto.negocio.id },
    }),
  ]);
  return { ...contexto, sedes, conexionesGoogle, configuracionAvisos };
}

export async function obtenerFacturacion() {
  const contexto = await requerirContextoPanel();
  const pagos = await prisma.pago.findMany({
    where: {
      negocioId: contexto.negocio.id,
      reservaId: null,
      ventaId: null,
    },
    select: {
      id: true,
      proveedor: true,
      estado: true,
      monto: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: "desc" },
    take: 30,
  });
  return { ...contexto, pagos };
}

export async function obtenerInventario() {
  const { negocio } = await requerirContextoPanel();
  const [productos, sedes, libres] = await Promise.all([
    prisma.producto.findMany({
      where: { negocioId: negocio.id },
      include: {
        valoresPersonalizados: true,
        existencias: { include: { sede: { select: { nombre: true } } } },
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.columnaInventario.findMany({
      where: { negocioId: negocio.id },
      orderBy: { orden: "asc" },
    }),
  ]);
  return { negocio, productos, sedes, libres };
}

export async function obtenerCompras() {
  const { negocio } = await requerirContextoPanel();
  const [sedes, productos, compras] = await Promise.all([
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.producto.findMany({
      where: { negocioId: negocio.id, activo: true },
      select: { id: true, nombre: true, sku: true, precio: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.compra.findMany({
      where: { negocioId: negocio.id },
      include: {
        sede: { select: { nombre: true } },
        items: { select: { id: true, nombre: true, cantidad: true } },
      },
      orderBy: { creadoEn: "desc" },
      take: 100,
    }),
  ]);
  return { negocio, sedes, productos, compras };
}

export async function obtenerCaja() {
  const { negocio } = await requerirContextoPanel();
  const inicio = inicioDelDia(new Date(), negocio.zonaHoraria);
  const [servicios, productos, movimientos, sedes, profesionales] =
    await Promise.all([
      prisma.servicio.findMany({
        where: { negocioId: negocio.id, activo: true },
        include: { sedes: true },
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
      prisma.sede.findMany({
        where: { negocioId: negocio.id, activa: true },
        select: { id: true, nombre: true },
      }),
      prisma.profesional.findMany({
        where: { negocioId: negocio.id, activo: true },
        select: { id: true, nombre: true, apellido: true },
        orderBy: { nombre: "asc" },
      }),
    ]);
  return { negocio, servicios, productos, movimientos, sedes, profesionales };
}

export async function obtenerReportes(
  entrada?: string,
  sedeId?: string,
  atribucion?: string,
) {
  const { negocio } = await requerirContextoPanel();
  const periodo = periodoReporte(entrada),
    rango = rangoReporte(periodo, negocio.zonaHoraria);
  const [sedes, profesionales] = await Promise.all([
    prisma.sede.findMany({
      where: { negocioId: negocio.id, activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.profesional.findMany({
      where: { negocioId: negocio.id, activo: true },
      select: { id: true, nombre: true, apellido: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  const localSeleccionado =
    sedes.length > 1 ? sedes.find((s) => s.id === sedeId)?.id : undefined;
  const seleccion =
    ["local", "sin-asignar", "eliminado"].includes(atribucion ?? "") ||
    profesionales.some((p) => p.id === atribucion)
      ? (atribucion ?? "")
      : "";
  const filtro =
    seleccion === "local"
      ? { origen: "LOCAL" as const }
      : seleccion === "sin-asignar"
        ? { origen: "SIN_ASIGNAR" as const }
        : seleccion === "eliminado"
          ? { origen: "EQUIPO" as const, profesionalId: null }
          : seleccion
            ? { origen: "EQUIPO" as const, profesionalId: seleccion }
            : {};
  const movimientos = await prisma.movimientoCaja.findMany({
    where: {
      negocioId: negocio.id,
      ...(localSeleccionado ? { sedeId: localSeleccionado } : {}),
      ...filtro,
      creadoEn: { gte: rango.desde, lt: rango.hasta },
      tipo: { in: ["INGRESO", "EGRESO"] },
    },
    select: { id: true, creadoEn: true, tipo: true, monto: true },
    orderBy: { creadoEn: "asc" },
  });
  return {
    negocio,
    movimientos,
    sedes,
    profesionales,
    localSeleccionado,
    atribucion: seleccion,
    periodo,
  };
}

export const obtenerSitioPublico = cache(async function obtenerSitioPublico(
  slug: string,
) {
  return prisma.negocio.findFirst({
    where: {
      OR: [
        { slug },
        { sedes: { some: { subdominio: slug, activa: true } } },
      ],
    },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      telefono: true,
      politicaContacto: true,
      publicado: true,
      suscripcion: {
        select: { estado: true, pruebaFinalizaEn: true, graciaHasta: true },
      },
      configuracionSitio: { select: { publicada: true } },
      sedes: {
        where: { activa: true },
        select: {
          id: true,
          nombre: true,
          subdominio: true,
          direccion: true,
          telefono: true,
          latitud: true,
          longitud: true,
          googlePuntaje: true,
          googleResenas: true,
          googleMapsUrl: true,
          horarios: {
            orderBy: { diaSemana: "asc" },
            select: { diaSemana: true, abre: true, cierra: true, activo: true },
          },
        },
      },
      servicios: {
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          duracionMinutos: true,
          precio: true,
          imagen: true,
          categoria: { select: { nombre: true } },
          sedes: { select: { sedeId: true } },
          profesionales: { select: { profesionalId: true } },
        },
      },
      profesionales: {
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          especialidad: true,
          biografia: true,
          foto: true,
          sedes: { select: { sedeId: true } },
          servicios: { select: { servicioId: true } },
        },
      },
    },
  });
});

function inicioDelDia(fecha: Date, zonaHoraria: string) {
  return fechaLocalAUtc(fechaEnZona(fecha, zonaHoraria), "00:00", zonaHoraria);
}

function fechaEnZona(fecha: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
