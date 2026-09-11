/** Declara los contratos publicos que comparten frontend, API y worker. */
export type RolMembresia = "DUENO" | "ADMINISTRADOR" | "PROFESIONAL";
export type EstadoReserva =
  | "BORRADOR"
  | "RETENIDA"
  | "PENDIENTE_PAGO"
  | "CONFIRMADA"
  | "COMPLETADA"
  | "AUSENTE"
  | "CANCELADA"
  | "VENCIDA";
export type EstadoSuscripcion =
  "CONFIGURACION_GRATUITA" | "ACTIVA" | "EN_GRACIA" | "PAUSADA" | "CANCELADA";
export type EstadoPago =
  | "PENDIENTE"
  | "APROBADO"
  | "RECHAZADO"
  | "REEMBOLSADO"
  | "REEMBOLSADO_PARCIAL";

export interface SedeResumen {
  id: string;
  nombre: string;
  direccion: string;
  telefono?: string;
}

export interface ServicioPublico {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  duracionMinutos: number;
  precio: number;
  imagen?: string;
}

export interface ProfesionalPublico {
  id: string;
  nombre: string;
  especialidad: string;
  iniciales: string;
  apellido?: string;
  foto?: string;
}

export interface NegocioPublico {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  calificacion: number;
  resenas: number;
  sedes: SedeResumen[];
  servicios: ServicioPublico[];
  profesionales: ProfesionalPublico[];
}

export interface CrearReservaEntrada {
  negocioSlug: string;
  sedeId: string;
  profesionalId: string;
  servicioIds: string[];
  inicio: string;
  cliente: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
  };
}

export type PoliticaContacto = "EMAIL" | "TELEFONO" | "CUALQUIERA" | "NINGUNO";

export interface ConfiguracionSitioPublicada {
  titulo: string;
  descripcion: string;
  colorPrincipal: string;
  colorFondo: string;
  colorTexto: string;
  logoUrl?: string;
  whatsapp?: string;
  instagram?: string;
  hero: string[];
  carruselAutomatico: boolean;
}

export interface ReservaCreada {
  id: string;
  codigo: string;
  estado: EstadoReserva;
  venceEn: string;
}
