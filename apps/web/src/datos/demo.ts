/** Provee datos coherentes para recorrer el producto sin depender de servicios externos. */
import type { NegocioPublico } from "@turnos/contratos";

export const negocioDemo: NegocioPublico = {
  id: "neg_demo",
  slug: "manly-barber",
  nombre: "Manly Barber Club",
  descripcion: "Cortes clasicos, estilo contemporaneo y un momento para vos.",
  direccion: "Honduras 4821, Palermo, CABA",
  telefono: "+54 9 11 5555-0199",
  calificacion: 4.9,
  resenas: 186,
  sedes: [
    {
      id: "sede_palermo",
      nombre: "Palermo Soho",
      direccion: "Honduras 4821, CABA",
      telefono: "+54 9 11 5555-0199",
    },
    {
      id: "sede_belgrano",
      nombre: "Belgrano",
      direccion: "Juramento 2145, CABA",
      telefono: "+54 9 11 5555-0277",
    },
  ],
  servicios: [
    {
      id: "corte",
      nombre: "Corte de autor",
      categoria: "Cabello",
      descripcion: "Asesoria, lavado, corte y styling final.",
      duracionMinutos: 45,
      precio: 12_000,
    },
    {
      id: "barba",
      nombre: "Ritual de barba",
      categoria: "Barba",
      descripcion: "Toalla caliente, perfilado y nutricion.",
      duracionMinutos: 30,
      precio: 8_500,
    },
    {
      id: "combo",
      nombre: "Corte + barba",
      categoria: "Combos",
      descripcion: "La experiencia completa, sin apuros.",
      duracionMinutos: 75,
      precio: 18_500,
    },
    {
      id: "color",
      nombre: "Camuflaje de canas",
      categoria: "Color",
      descripcion: "Resultado natural y personalizado.",
      duracionMinutos: 35,
      precio: 11_500,
    },
  ],
  profesionales: [
    {
      id: "franco",
      nombre: "Franco",
      especialidad: "Cortes y fades",
      iniciales: "FR",
    },
    {
      id: "mica",
      nombre: "Mica",
      especialidad: "Color y styling",
      iniciales: "MI",
    },
    {
      id: "tomas",
      nombre: "Tomas",
      especialidad: "Barba clasica",
      iniciales: "TO",
    },
  ],
};

export const turnosHoy = [
  {
    hora: "09:00",
    cliente: "Luciano Peralta",
    servicio: "Corte de autor",
    profesional: "Franco",
    estado: "Confirmado",
  },
  {
    hora: "10:00",
    cliente: "Emilia Ferrer",
    servicio: "Color + nutricion",
    profesional: "Mica",
    estado: "En el salon",
  },
  {
    hora: "11:30",
    cliente: "Martin Costa",
    servicio: "Corte + barba",
    profesional: "Tomas",
    estado: "Confirmado",
  },
  {
    hora: "13:00",
    cliente: "Sofia Luna",
    servicio: "Styling",
    profesional: "Mica",
    estado: "Pendiente",
  },
];
