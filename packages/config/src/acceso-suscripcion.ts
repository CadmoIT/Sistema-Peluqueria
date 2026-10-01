/** Reglas compartidas por panel, reservas públicas y automatizaciones. */
export type VigenciaSuscripcion = {
  estado: string;
  plan?: string;
  pruebaFinalizaEn?: Date | null;
  proximoCobro?: Date | null;
  graciaHasta?: Date | null;
  cancelarAlFinal?: boolean;
};

export const DIA_MS = 86_400_000;
export const DIAS_RETIRO_SITIO_TRAS_PRUEBA = 30;

export function tieneAccesoOperativo(suscripcion: VigenciaSuscripcion | null | undefined, ahora = new Date()) {
  if (!suscripcion) return false;
  switch (suscripcion.estado) {
    case "CONFIGURACION_GRATUITA":
      return Boolean(suscripcion.pruebaFinalizaEn && suscripcion.pruebaFinalizaEn > ahora);
    case "ACTIVA":
      return Boolean(suscripcion.proximoCobro && suscripcion.proximoCobro > ahora);
    case "EN_GRACIA":
      return Boolean(suscripcion.graciaHasta && suscripcion.graciaHasta > ahora);
    default:
      return false;
  }
}

export function puedeRecuperarSitio(suscripcion: VigenciaSuscripcion | null | undefined, ahora = new Date()) {
  return Boolean(suscripcion && ["autogestionado", "pro"].includes(suscripcion.plan ?? "") &&
    suscripcion.estado === "ACTIVA" && tieneAccesoOperativo(suscripcion, ahora));
}

export function correspondeRetirarSitio(finPrueba: Date | null | undefined, comproAlgunaVez: boolean, ahora = new Date()) {
  return Boolean(!comproAlgunaVez && finPrueba &&
    finPrueba.getTime() + DIAS_RETIRO_SITIO_TRAS_PRUEBA * DIA_MS <= ahora.getTime());
}

export type AvisoSuscripcion = { tipo: "prueba" | "vencimiento" | "vencido"; texto: string; accion: string; href: string };

export function avisoSuscripcion(suscripcion: VigenciaSuscripcion | null | undefined, ahora = new Date()): AvisoSuscripcion | null {
  if (!tieneAccesoOperativo(suscripcion, ahora)) return {
    tipo: "vencido",
    texto: "Tus datos siguen a salvo. Activá un plan y volvé a disfrutar de todas las herramientas.",
    accion: "Ver planes", href: "/panel/planes",
  };
  if (suscripcion?.estado === "CONFIGURACION_GRATUITA" && suscripcion.pruebaFinalizaEn) {
    const restante = suscripcion.pruebaFinalizaEn.getTime() - ahora.getTime();
    if (restante > 5 * DIA_MS) return null;
    // Redondear hacia arriba evita anunciar cero minutos antes del vencimiento.
    const minutosTotales = Math.ceil(restante / 60_000);
    const dias = Math.floor(minutosTotales / 1440);
    const horas = Math.floor((minutosTotales % 1440) / 60);
    const minutos = minutosTotales % 60;
    return {
      tipo: "prueba",
      texto: `Tu prueba termina en ${dias} ${dias === 1 ? "día" : "días"}, ${horas} ${horas === 1 ? "hora" : "horas"} y ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
      accion: "Elegir mi plan", href: "/panel/planes",
    };
  }
  if (suscripcion?.estado !== "ACTIVA" || !suscripcion.cancelarAlFinal || !suscripcion.proximoCobro) return null;
  const restante = suscripcion.proximoCobro.getTime() - ahora.getTime();
  if (restante > 3 * DIA_MS) return null;
  const dias = Math.ceil(restante / DIA_MS);
  return {
    tipo: "vencimiento",
    texto: `${dias === 1 ? "Te queda 1 día" : `Te quedan ${dias} días`} de acceso. Mantené tu negocio en marcha sin interrupciones.`,
    accion: "Activar renovación", href: "/panel/facturacion#renovacion-automatica",
  };
}
