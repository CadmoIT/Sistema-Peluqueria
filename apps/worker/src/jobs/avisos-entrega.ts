/** Entrega avisos pendientes verificando de nuevo turno, plan y consentimiento. */
import { prisma } from "../lib/prisma.js";
import { enviarCorreoAviso, smtpConfigurado } from "../lib/correo-smtp.js";
import { enviarPlantillaWhatsapp, whatsappConfigurado } from "../lib/whatsapp-cloud.js";
import { hayConsentimientoWhatsapp, turnoSigueVigente } from "./avisos-reglas.js";

export async function entregarAvisos() {
  const ahora = new Date();
  const avisos = await prisma.avisoReserva.findMany({
    where: { estado: "PENDIENTE", programadoPara: { lte: ahora } },
    include: {
      reserva: {
        include: {
          cliente: true,
          sede: { select: { subdominio: true } },
          negocio: { include: { suscripcion: true, configuracionAvisos: true } },
          servicios: { include: { servicio: true }, orderBy: { orden: "asc" } },
        },
      },
    },
    orderBy: { programadoPara: "asc" },
    take: 40,
  });

  for (const aviso of avisos) {
    const reclamado = await prisma.avisoReserva.updateMany({
      where: { id: aviso.id, estado: "PENDIENTE" },
      data: { estado: "ENVIANDO", intentos: { increment: 1 } },
    });
    if (!reclamado.count) continue;

    const reserva = aviso.reserva;
    const negocio = reserva.negocio;
    const cliente = reserva.cliente;
    if (!cliente || !reserva.profesionalId) {
      await prisma.avisoReserva.update({ where: { id: aviso.id }, data: { estado: "OMITIDO", error: "Ficha eliminada." } });
      continue;
    }
    const ajustes = negocio.configuracionAvisos;
    const suscripcion = negocio.suscripcion;
    const pruebaVigente = suscripcion?.estado === "CONFIGURACION_GRATUITA" &&
      Boolean(suscripcion.pruebaFinalizaEn && suscripcion.pruebaFinalizaEn > ahora);
    const planVigente = suscripcion?.estado === "ACTIVA" ||
      (suscripcion?.estado === "EN_GRACIA" && Boolean(suscripcion.graciaHasta && suscripcion.graciaHasta > ahora));
    const turnoVigente = turnoSigueVigente(
      reserva.estado, reserva.inicio, aviso.inicioTurno, aviso.tipo, ahora,
    );
    const emailHabilitado = Boolean(cliente.email &&
      (aviso.tipo === "CONFIRMACION"
        ? (ajustes?.emailConfirmacionActivo ?? true)
        : (ajustes?.emailRecordatorioActivo ?? true)));
    const whatsappHabilitado = hayConsentimientoWhatsapp(
      suscripcion?.plan, suscripcion?.estado,
      cliente.aceptaWhatsapp, cliente.consentimientoWhatsappEn, cliente.telefono,
    ) && Boolean(aviso.tipo === "CONFIRMACION"
      ? ajustes?.whatsappConfirmacionActivo
      : ajustes?.whatsappRecordatorioActivo);

    if ((!pruebaVigente && !planVigente) || !turnoVigente ||
      (aviso.canal === "EMAIL" ? !emailHabilitado : !whatsappHabilitado)) {
      await prisma.avisoReserva.update({
        where: { id: aviso.id },
        data: { estado: "OMITIDO", error: "El turno, plan o consentimiento cambió." },
      });
      continue;
    }

    const variables = {
      nombre: cliente.nombre || "cliente",
      negocio: negocio.nombre,
      servicio: reserva.servicios.map((item) => item.servicio.nombre).join(", ") || "tu servicio",
      fecha: new Intl.DateTimeFormat("es-AR", {
        timeZone: negocio.zonaHoraria,
        dateStyle: "long",
      }).format(reserva.inicio),
      hora: new Intl.DateTimeFormat("es-AR", {
        timeZone: negocio.zonaHoraria,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(reserva.inicio),
      enlace: enlacePublico(reserva.sede.subdominio ?? negocio.slug),
    };

    try {
      const vigente = await prisma.avisoReserva.findFirst({ where: { id: aviso.id, estado: "ENVIANDO", reserva: { clienteId: cliente.id, profesionalId: { not: null }, estado: "CONFIRMADA" } } });
      if (!vigente) continue;
      if (aviso.canal === "EMAIL") {
        if (!smtpConfigurado()) throw new Error("Gmail SMTP no está configurado.");
        const asunto = aviso.tipo === "CONFIRMACION"
          ? ajustes?.emailAsuntoConfirmacion ?? "Tu turno en {negocio} está confirmado"
          : ajustes?.emailAsuntoRecordatorio ?? "Recordatorio de tu turno en {negocio}";
        const texto = aviso.tipo === "CONFIRMACION"
          ? ajustes?.emailTextoConfirmacion ?? "Hola {nombre}, tu turno de {servicio} es el {fecha} a las {hora} en {negocio}."
          : ajustes?.emailTextoRecordatorio ?? "Hola {nombre}, te recordamos tu turno de {servicio} el {fecha} a las {hora} en {negocio}.";
        await enviarCorreoAviso(
          cliente.email!,
          completar(asunto, variables),
          completar(texto, variables),
          negocio.email,
        );
      } else {
        if (!whatsappConfigurado()) throw new Error("WhatsApp automático no está configurado.");
        await enviarPlantillaWhatsapp(cliente.telefono!, aviso.tipo, variables);
      }
      await prisma.avisoReserva.update({
        where: { id: aviso.id },
        data: { estado: "ENVIADO", enviadoEn: new Date(), error: null },
      });
    } catch (error) {
      await prisma.avisoReserva.update({
        where: { id: aviso.id },
        data: {
          estado: "FALLIDO",
          error: (error instanceof Error ? error.message : "No se pudo entregar el aviso.").slice(0, 180),
        },
      });
    }
  }
}

function enlacePublico(slug: string) {
  const dominio = process.env.PUBLIC_SITE_DOMAIN?.trim();
  if (dominio) {
    const host = dominio
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^\*\./, "")
      .replace(/\/+$/, "");
    return `https://${slug}.${host}`;
  }
  return `${(process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, "")}/sitio/${slug}`;
}

function completar(texto: string, variables: Record<string, string>) {
  return texto.replace(
    /\{(nombre|negocio|servicio|fecha|hora|enlace)\}/g,
    (_, clave: string) => variables[clave] ?? "",
  );
}
