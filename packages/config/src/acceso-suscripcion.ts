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

export type AvisoSuscripcion = { tipo: "vencimiento" | "vencido"; texto: string; accion: string; href: string };

export function avisoSuscripcion(suscripcion: VigenciaSuscripcion | null | undefined, ahora = new Date()): AvisoSuscripcion | null {
  if (!tieneAccesoOperativo(suscripcion, ahora)) return {
    tipo: "vencido",
    texto: "Tus datos siguen a salvo. Activá un plan y volvé a disfrutar de todas las herramientas.",
    accion: "Ver planes", href: "/panel/planes",
  };
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
