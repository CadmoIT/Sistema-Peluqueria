/** Muestra información accesible fuera de las tarjetas, anclada al avatar seleccionado. */
/* eslint-disable @next/next/no-img-element -- Fotos configuradas por el negocio. */
"use client";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
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
  const id = useId();
  const [activo, cambiar] = useState<{
    profesional: ProfesionalAvatar;
    x: number;
    y: number;
    color: string;
  } | null>(null);
  useEffect(() => {
    const cerrar = () => cambiar(null);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, []);
  function mostrar(p: ProfesionalAvatar, elemento: HTMLElement) {
    const rect = elemento.getBoundingClientRect();
    cambiar({
      profesional: p,
      x: rect.left + rect.width / 2,
      y: rect.top,
      color:
        getComputedStyle(elemento)
          .getPropertyValue("--sitio-principal")
          .trim() || "#126783",
    });
  }
  const ancho =
    typeof window === "undefined" ? 240 : Math.min(240, window.innerWidth - 24);
  const izquierda = activo
    ? Math.max(
        12,
        Math.min(activo.x - ancho / 2, window.innerWidth - ancho - 12),
      )
    : 0;
  return (
    <div
      className="publico-identidad__equipo-grupo"
      role="list"
      aria-label="Equipo de profesionales"
    >
      {profesionales.map((p) => (
        <div role="listitem" key={p.id}>
          <button
            type="button"
            className="publico-identidad__profesional"
            aria-label={`${p.nombre} ${p.apellido ?? ""}, ${p.especialidad ?? "Profesional"}`}
            aria-describedby={activo?.profesional.id === p.id ? id : undefined}
            onMouseEnter={(e) => mostrar(p, e.currentTarget)}
            onMouseLeave={() => cambiar(null)}
            onFocus={(e) => mostrar(p, e.currentTarget)}
            onBlur={() => cambiar(null)}
            onClick={(e) => mostrar(p, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cambiar(null);
            }}
          >
            {p.foto ? (
              <img src={p.foto} alt="" />
            ) : (
              <i>
                {`${p.nombre[0] ?? ""}${p.apellido?.[0] ?? ""}`.toUpperCase()}
              </i>
            )}
          </button>
        </div>
      ))}
      {activo &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="profesional-tooltip-portal"
            style={{
              position: "fixed",
              zIndex: 10000,
              left: izquierda,
              top: activo.y < 90 ? activo.y + 58 : activo.y - 10,
              transform: activo.y < 90 ? undefined : "translateY(-100%)",
              width: ancho,
              background: activo.color,
            }}
          >
            <strong>
              {activo.profesional.nombre} {activo.profesional.apellido}
            </strong>
            <small>{activo.profesional.especialidad ?? "Profesional"}</small>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: Math.max(
                  8,
                  Math.min(ancho - 18, activo.x - izquierda - 5),
                ),
                width: 10,
                height: 10,
                background: activo.color,
                transform: "rotate(45deg)",
                ...(activo.y < 90 ? { top: -5 } : { bottom: -5 }),
              }}
            />
          </span>,
          document.body,
        )}
    </div>
  );
}
