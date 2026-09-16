/** Programa confirmaciones y recordatorios para todos los orígenes de reservas. */
import type { CanalAviso, TipoAviso } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { correspondeRecordatorio, hayConsentimientoWhatsapp, UN_DIA_MS } from "./avisos-reglas.js";

export async function programarAvisos() {
  const ahora = new Date();
  const reservas = await prisma.reserva.findMany({
    where: {
      estado: "CONFIRMADA",
      inicio: { gt: ahora },
      OR: [
        { creadoEn: { gte: new Date(ahora.getTime() - 3_600_000) } },
        { inicio: { lte: new Date(ahora.getTime() + UN_DIA_MS + 3_600_000) } },
      ],
      negocio: { slug: { not: "estudio-aurora-demo" } },
    },
    include: {
      cliente: true,
      negocio: { include: { suscripcion: true, configuracionAvisos: true } },
    },
  });
  const nuevos: Array<{
    negocioId: string;
    reservaId: string;
    canal: CanalAviso;
    tipo: TipoAviso;
    inicioTurno: Date;
    programadoPara: Date;
  }> = [];

  for (const reserva of reservas) {
    if (!reserva.cliente || !reserva.profesionalId) continue;
    const suscripcion = reserva.negocio.suscripcion;
    const ajustes = reserva.negocio.configuracionAvisos;
    const pruebaVigente = suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
      Boolean(suscripcion.pruebaFinalizaEn && suscripcion.pruebaFinalizaEn > ahora);
    const planVigente = suscripcion?.estado === "ACTIVA" ||
      (suscripcion?.estado === "EN_GRACIA" && Boolean(suscripcion.graciaHasta && suscripcion.graciaHasta > ahora));
    if (!pruebaVigente && !planVigente) continue;

    const permiteWhatsapp = hayConsentimientoWhatsapp(
      suscripcion?.plan,
      suscripcion?.estado,
      reserva.cliente.aceptaWhatsapp,
      reserva.cliente.consentimientoWhatsappEn,
      reserva.cliente.telefono,
    );
    const agregar = (canal: CanalAviso, tipo: TipoAviso, programadoPara: Date) => {
      nuevos.push({
        negocioId: reserva.negocioId,
        reservaId: reserva.id,
        canal,
        tipo,
        inicioTurno: reserva.inicio,
        programadoPara,
      });
    };

    if (reserva.creadoEn.getTime() >= ahora.getTime() - 3_600_000) {
      if (reserva.cliente.email && (ajustes?.emailConfirmacionActivo ?? true))
        agregar("EMAIL", "CONFIRMACION", reserva.creadoEn);
      if (permiteWhatsapp && ajustes?.whatsappConfirmacionActivo)
        agregar("WHATSAPP", "CONFIRMACION", reserva.creadoEn);
    }

    if (correspondeRecordatorio(reserva.creadoEn, reserva.inicio)) {
      const momento = new Date(reserva.inicio.getTime() - UN_DIA_MS);
      if (reserva.cliente.email && (ajustes?.emailRecordatorioActivo ?? true))
        agregar("EMAIL", "RECORDATORIO", momento);
      if (permiteWhatsapp && ajustes?.whatsappRecordatorioActivo)
        agregar("WHATSAPP", "RECORDATORIO", momento);
    }
  }

  if (nuevos.length) {
    await prisma.avisoReserva.createMany({ data: nuevos, skipDuplicates: true });
  }
}
