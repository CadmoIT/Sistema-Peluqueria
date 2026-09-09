/** Centraliza las rutas para evitar textos repetidos entre controladores y configuración. */

export const RUTAS_API = {
  salud: "salud",
  negociosPublicos: "publico/negocios",
  reservasPublicas: "publico/reservas",
  facturacion: "facturacion",
  webhooks: "webhooks",
} as const;
