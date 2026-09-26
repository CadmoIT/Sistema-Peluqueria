/* eslint-disable @next/next/no-img-element -- Las fotos pueden estar alojadas en distintos proveedores. */
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type ProfesionalAvatar = {
  id: string;
  nombre: string;
  apellido: string | null;
  especialidad: string | null;
  foto: string | null;
};

export function GrupoProfesionales({
  profesionales,
}: {
  profesionales: ProfesionalAvatar[];
}) {
  const [activo, setActivo] = useState<string | null>(null);
  const reducirMovimiento = useReducedMotion();

  return (
    <motion.div
      className="publico-identidad__equipo-grupo"
      role="list"
      aria-label="Equipo de profesionales"
      onMouseLeave={() => setActivo(null)}
    >
      {profesionales.map((profesional, indice) => {
        const seleccionado = activo === profesional.id;
        const alineacionTooltip =
          indice === 0
            ? "inicio"
            : indice === profesionales.length - 1
              ? "fin"
              : "centro";
        const nombreCompleto = `${profesional.nombre} ${profesional.apellido ?? ""}`.trim();

        return (
          <motion.div
            className="publico-identidad__profesional"
            key={profesional.id}
            role="listitem"
            tabIndex={0}
            aria-label={`${nombreCompleto}, ${profesional.especialidad ?? "Profesional"}`}
            animate={{
              y: seleccionado ? (reducirMovimiento ? -10 : -24) : 0,
              scale: seleccionado ? (reducirMovimiento ? 1.04 : 1.12) : 1,
            }}
            transition={
              reducirMovimiento
                ? { duration: 0.12, ease: "easeOut" }
                : { type: "spring", stiffness: 300, damping: 17 }
            }
            style={{ zIndex: seleccionado ? profesionales.length + 1 : profesionales.length - indice }}
            onMouseEnter={() => setActivo(profesional.id)}
            onFocus={() => setActivo(profesional.id)}
            onBlur={() => setActivo(null)}
          >
            {profesional.foto ? (
              <img src={profesional.foto} alt="" />
            ) : (
              <i>{iniciales(profesional.nombre, profesional.apellido)}</i>
            )}
            <AnimatePresence>
              {seleccionado && (
                <motion.span
                  className="publico-identidad__profesional-tooltip"
                  aria-hidden="true"
                  initial={{
                    opacity: 0,
                    x: alineacionTooltip === "centro" ? "-50%" : 0,
                    y: 8,
                    scale: 0.92,
                  }}
                  animate={{
                    opacity: 1,
                    x: alineacionTooltip === "centro" ? "-50%" : 0,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: alineacionTooltip === "centro" ? "-50%" : 0,
                    y: 5,
                    scale: 0.96,
                  }}
                  transition={
                    reducirMovimiento
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 35 }
                  }
                >
                  <strong>{nombreCompleto}</strong>
                  <small>{profesional.especialidad ?? "Profesional"}</small>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function iniciales(nombre: string, apellido: string | null) {
  return `${nombre[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase();
}
