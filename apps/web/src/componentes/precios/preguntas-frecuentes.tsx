/** Acordeón de precios que mantiene una sola pregunta abierta a la vez. */
"use client";

import { useState } from "react";

const preguntas = [
  {
    pregunta: "¿Puedo probarlo sin pagar?",
    respuesta:
      "Sí. El plan Gratis permite usar la agenda y el sitio durante siete días, sin tarjeta.",
  },
  {
    pregunta: "¿Cobran por sucursal o profesional?",
    respuesta: "No. Las sedes, profesionales y reservas no cambian tu plan.",
  },
  {
    pregunta: "¿Qué pasa si ya tengo dominio?",
    respuesta:
      "El plan Plus permite conectarlo sin costo adicional y mantiene disponible tu subdominio.",
  },
];

export function PreguntasFrecuentes() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <section className="faq-precios" aria-labelledby="faq-titulo">
      <h2 id="faq-titulo">Preguntas frecuentes</h2>
      <div className="faq-precios__lista">
        {preguntas.map(({ pregunta, respuesta }, indice) => {
          const estaAbierta = abierta === indice;
          const contenidoId = `faq-respuesta-${indice}`;
          return (
            <div
              className={`faq-precios__item${estaAbierta ? " abierta" : ""}`}
              key={pregunta}
            >
              <button
                type="button"
                className="faq-precios__pregunta"
                aria-expanded={estaAbierta}
                aria-controls={contenidoId}
                onClick={() => setAbierta(estaAbierta ? null : indice)}
              >
                <span>{pregunta}</span>
                <span className="faq-precios__flecha" aria-hidden="true">
                  ⌄
                </span>
              </button>
              <div
                id={contenidoId}
                className="faq-precios__respuesta"
                aria-hidden={!estaAbierta}
              >
                <p>{respuesta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
