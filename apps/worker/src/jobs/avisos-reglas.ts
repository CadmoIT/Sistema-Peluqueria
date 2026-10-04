/** Expresa reglas puras de vigencia para evitar avisos tardíos o duplicados. */
export const UN_DIA_MS = 86_400_000;

export function permiteCorreoDemo(configuracion: unknown, creadoEn: Date, email: string | null) {
  const config = configuracion as { demoCarla?: boolean; demoCarlaConfirmacionesDesde?: string } | null;
  if (!config?.demoCarla) return true;
  const desde = new Date(config.demoCarlaConfirmacionesDesde ?? "");
  return Number.isFinite(desde.getTime()) && creadoEn >= desde && Boolean(email && !/@(?:.*\.)?example\.com$/i.test(email));
}

export function correspondeRecordatorio(creadoEn: Date, inicio: Date) {
  return creadoEn.getTime() < inicio.getTime() - UN_DIA_MS;
}

export function turnoSigueVigente(
  estado: string,
  inicioActual: Date,
  inicioProgramado: Date,
  tipo: "CONFIRMACION" | "RECORDATORIO",
  ahora: Date,
) {
  return estado === "CONFIRMADA" &&
    inicioActual.getTime() === inicioProgramado.getTime() &&
    inicioActual > ahora &&
    (tipo === "CONFIRMACION" || inicioActual.getTime() - ahora.getTime() >= 3_600_000);
}

export function hayConsentimientoWhatsapp(
  plan: string | null | undefined,
  estadoPlan: string | null | undefined,
  acepta: boolean,
  fechaConsentimiento: Date | null,
  telefono: string | null,
) {
  return plan === "pro" && estadoPlan === "ACTIVA" && acepta &&
    Boolean(fechaConsentimiento && telefono);
}
