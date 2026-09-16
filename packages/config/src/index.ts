/** Centraliza la marca, los precios y las reglas comerciales compartidas. */
export const MARCA_APP = process.env.MARCA_APP ?? "TurnosRapidos";

export const PLAN_GRATIS = {
  id: "PRUEBA",
  nombre: "Gratis",
  precioMensual: 0,
  descripcion: "Probá tu agenda y tu sitio durante siete días.",
  destacado: false,
  beneficios: ["Siete días de prueba", "Sitio de reservas", "Avisos por email durante la prueba"],
} as const;

export const PLANES = [
  {
    id: "autogestionado",
    nombre: "Plus",
    precioMensual: 9_900,
    descripcion: "Tu negocio organizado y avisos automáticos por email.",
    destacado: true,
    beneficios: [
      "Sedes y profesionales ilimitados",
      "Sitio y agenda de reservas",
      "Confirmaciones y recordatorios por email",
    ],
  },
] as const;

export const PLAN_PRO = {
  id: "pro",
  nombre: "PRO",
  precioMensual: null,
  descripcion: "Todo Plus, con recordatorios automáticos por WhatsApp.",
  destacado: false,
  beneficios: ["Todo Plus", "Recordatorios por WhatsApp"],
} as const;

export function nombrePlan(plan: string | null | undefined) {
  if (plan === "PRUEBA" || !plan) return "Gratis";
  if (plan === "autogestionado") return "Plus";
  if (plan === "pro") return "PRO";
  if (plan === "dominio-gestionado") return "Dominio gestionado (anterior)";
  return "Plan anterior";
}

export const PAQUETES_WHATSAPP = [
  { mensajes: 100, precioMensual: 5_900 },
  { mensajes: 300, precioMensual: 14_900 },
  { mensajes: 1_000, precioMensual: 44_900 },
] as const;

export const RETENCION_TURNO_MINUTOS = 10;
export const DIAS_GRACIA_SUSCRIPCION = 10;
export const DIAS_RETENCION_DATOS = 90;

export function formatearPesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
