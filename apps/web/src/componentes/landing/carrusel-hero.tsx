/** Recorre los rubros en un ciclo suave cada seis segundos, sin controles visuales ni etiquetas. */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const fotos = [
  {
    nombre: "Manicuría",
    archivo: "manicuria",
    descripcion: "Una profesional realiza una manicuría",
  },
  {
    nombre: "Veterinaria",
    archivo: "veterinaria",
    descripcion: "Una veterinaria atiende a un perro junto a su dueño",
  },
  {
    nombre: "Tatuajes",
    archivo: "tatuajes",
    descripcion: "Un tatuador trabaja en el brazo de su clienta",
  },
  {
    nombre: "Masajista",
    archivo: "masajista",
    descripcion: "Un masajista realiza un masaje de espalda y cuello",
  },
  {
    nombre: "Barbería",
    archivo: "barberia",
    descripcion: "Un barbero realiza un corte de cabello",
  },
  {
    nombre: "Consultorio",
    archivo: "consultorio",
    descripcion: "Un médico conversa con su paciente en el consultorio",
  },
  {
    nombre: "Peluquería",
    archivo: "peluqueria",
    descripcion: "Una peluquera peina el cabello de su clienta",
  },
  {
    nombre: "Pádel",
    archivo: "padel",
    descripcion: "Cuatro personas juegan al pádel en una cancha cubierta",
  },
];

export function CarruselHero() {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const cambiarVisibilidad = () => setOculto(document.hidden);
    setListo(true);
    cambiarVisibilidad();
    document.addEventListener("visibilitychange", cambiarVisibilidad);
    return () => {
      document.removeEventListener("visibilitychange", cambiarVisibilidad);
    };
  }, []);

  useEffect(() => {
    // Conserva el desplazamiento solicitado sin pausas automáticas por foco o preferencias del sistema.
    if (pausado || oculto) return;
    const temporizador = window.setInterval(
      () => setActual((indice) => (indice + 1) % fotos.length),
      6000,
    );
    return () => window.clearInterval(temporizador);
  }, [pausado, oculto]);

  const mover = (paso: number) =>
    setActual((indice) => (indice + paso + fotos.length) % fotos.length);

  return (
    <div
      className="hero-carrusel"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Negocios que pueden usar TurnosRápidos"
      data-listo={listo}
    >
      <div
        className="hero-carrusel__escenario"
        onKeyDown={(evento) => {
          if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
            evento.preventDefault();
            mover(evento.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {fotos.map((foto, indice) => {
          const posicion =
            ((indice - actual + fotos.length + 4) % fotos.length) - 4;
          const fuera = Math.abs(posicion) > 2;
          return (
            <button
              type="button"
              key={foto.nombre}
              className={
                fuera
                  ? "hero-carrusel__foto hero-carrusel__foto--fuera"
                  : "hero-carrusel__foto"
              }
              data-posicion={posicion}
              aria-hidden={fuera || undefined}
              tabIndex={fuera ? -1 : 0}
              aria-label={`Ver ${foto.nombre}`}
              aria-pressed={posicion === 0}
              onClick={() => setActual(indice)}
            >
              <Image
                src={`/landing/${foto.archivo}.png`}
                alt={foto.descripcion}
                width={1448}
                height={1086}
                sizes="(max-width: 600px) 78vw, (max-width: 1440px) 44vw, 640px"
                priority={indice === 0}
                loading={indice === 0 ? undefined : "eager"}
                draggable={false}
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="hero-carrusel__pausa-accesible"
        onClick={() => setPausado(!pausado)}
      >
        {pausado ? "Reanudar carrusel" : "Pausar carrusel"}
      </button>
    </div>
  );
}
