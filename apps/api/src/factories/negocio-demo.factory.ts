/** Construye el negocio de demostración utilizado mientras no hay una base conectada. */
import type { NegocioPublico } from "@turnos/contratos";

export function crearNegocioDemostracion(): NegocioPublico {
  return {
    id: "neg_demo",
    slug: "manly-barber",
    nombre: "Manly Barber Club",
    descripcion: "Cortes clásicos, estilo contemporáneo y un momento para vos.",
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
        descripcion: "Asesoría, lavado, corte y styling final.",
        duracionMinutos: 45,
        precio: 12000,
      },
      {
        id: "barba",
        nombre: "Ritual de barba",
        categoria: "Barba",
        descripcion: "Toalla caliente, perfilado y nutrición.",
        duracionMinutos: 30,
        precio: 8500,
      },
      {
        id: "combo",
        nombre: "Corte + barba",
        categoria: "Combos",
        descripcion: "La experiencia completa, sin apuros.",
        duracionMinutos: 75,
        precio: 18500,
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
    ],
  };
}
