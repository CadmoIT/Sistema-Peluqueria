/** Traduce resultados de navegación y acciones en mensajes breves y comprensibles. */
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const mensajes: Record<
  string,
  { tipo: "success" | "error" | "info"; texto: string }
> = {
  "google-conectado": {
    tipo: "success",
    texto: "Google Calendar quedó conectado.",
  },
  "google-no-configurado": {
    tipo: "info",
    texto: "Google Calendar todavía no está configurado en este entorno.",
  },
  "google-error": {
    tipo: "error",
    texto: "No pudimos conectar Google Calendar.",
  },
  "google-cancelado": { tipo: "info", texto: "Cancelaste la autorización de Google Calendar. No se conectó la cuenta." },
  "facturacion-retorno": {
    tipo: "info",
    texto: "Estamos esperando la confirmación de Mercado Pago.",
  },
  "facturacion-no-configurada": {
    tipo: "info",
    texto: "Mercado Pago todavía no está configurado en este entorno.",
  },
  "facturacion-error": { tipo: "error", texto: "No pudimos iniciar el pago." },
  "facturacion-plan-invalido": {
    tipo: "error",
    texto: "El plan seleccionado no existe.",
  },
  "facturacion-plan-activo": {
    tipo: "info",
    texto:
      "Ya hay un plan activo o un pago iniciado. Consultá su estado antes de elegir otro.",
  },
  "sitio-guardado": { tipo: "success", texto: "El borrador quedó guardado." },
  "sitio-publicado": { tipo: "success", texto: "Tu sitio quedó publicado." },
  "clientes-creado": { tipo: "success", texto: "Cliente agregado." },
  "configuracion-guardada": {
    tipo: "success",
    texto: "Los datos quedaron guardados.",
  },
  "configuracion-local-guardado": {
    tipo: "success",
    texto: "Los datos del local quedaron guardados.",
  },
  "configuracion-local-creado": {
    tipo: "success",
    texto: "El nuevo local quedó agregado.",
  },
  "configuracion-local-duplicado": {
    tipo: "error",
    texto: "Ya existe un local con ese nombre.",
  },
  "configuracion-local-error": {
    tipo: "error",
    texto: "Completá un nombre válido para el local.",
  },
  "configuracion-local-sin-permiso": {
    tipo: "error",
    texto: "Sólo el dueño o un administrador puede agregar locales.",
  },
  "configuracion-google-actualizado": {
    tipo: "success",
    texto: "La puntuación de Google fue actualizada.",
  },
  "configuracion-avisos-guardados": {
    tipo: "success",
    texto: "Los mensajes automáticos quedaron guardados.",
  },
  "configuracion-avisos-error": {
    tipo: "error",
    texto: "Revisá los mensajes. Sólo se permiten las variables indicadas y no pueden quedar vacíos.",
  },
  "agenda-creado": { tipo: "success", texto: "Turno creado." },
};

export function NotificacionesPanel() {
  const parametros = useSearchParams();

  useEffect(() => {
    const google = parametros.get("google");
    const facturacion = parametros.get("facturacion");
    const sitio = parametros.get("sitio");
    const clientes = parametros.get("clientes");
    const configuracion = parametros.get("configuracion");
    const agenda = parametros.get("agenda");
    const clave = google
      ? "google-" + google
      : facturacion
        ? "facturacion-" + facturacion
        : sitio
          ? "sitio-" + sitio
          : clientes
            ? "clientes-" + clientes
            : configuracion
              ? "configuracion-" + configuracion
              : agenda
                ? "agenda-" + agenda
                : null;
    const mensaje = clave ? mensajes[clave] : undefined;
    if (!mensaje) return;
    toast[mensaje.tipo](mensaje.texto);
  }, [parametros]);

  return null;
}
