/** Centraliza la marca, los precios y las reglas comerciales compartidas. */
export const MARCA_APP = process.env.MARCA_APP ?? "TurnosRapidos";

export const PLANES = [
  {
    id: "autogestionado",
    nombre: "Autogestionado",
    precioMensual: 9_900,
    descripcion: "Tu sitio completo con subdominio o dominio propio.",
    destacado: false,
    beneficios: [
      "Sedes y profesionales ilimitados",
      "Suite de gestion completa",
      "Dominio propio opcional",
    ],
  },
  {
    id: "dominio-gestionado",
    nombre: "Dominio gestionado",
    precioMensual: 12_900,
    descripcion: "Nos ocupamos del dominio, DNS y renovacion.",
    destacado: true,
    beneficios: [
      "Todo Autogestionado",
      "Alta y renovacion .com.ar",
      "Configuracion y soporte DNS",
    ],
  },
] as const;

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
