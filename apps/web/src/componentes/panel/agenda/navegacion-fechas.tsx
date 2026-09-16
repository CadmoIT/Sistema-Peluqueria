/** Permite elegir fechas desde un mes compacto o cinco días con flechas laterales. */
"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sumarDias } from "@/servicios/disponibilidad.service";
import { cincoDiasDesde, semanaDe } from "./agenda-modelo";

const DIAS = [
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
  "SÁBADO",
  "DOMINGO",
];
export function FilaDias({
  fecha,
  hoy,
  elegir,
  pendiente,
}: {
  fecha: string;
  hoy: string;
  elegir: (fecha: string) => void;
  pendiente: boolean;
}) {
  return (
    <div className="agenda-fila-dias">
      <button
        className="agenda-flecha-dias"
        type="button"
        disabled={pendiente}
        onClick={() => elegir(sumarDias(fecha, -5))}
        aria-label="Cinco días anteriores"
      >
        <ChevronLeft size={22} />
      </button>
      <div className="agenda-dias" aria-label="Cinco días consecutivos">
        {cincoDiasDesde(fecha).map((dia) => (
          <button
            key={dia}
            type="button"
            onClick={() => elegir(dia)}
            disabled={pendiente}
            aria-pressed={dia === fecha}
            aria-current={dia === hoy ? "date" : undefined}
            className={dia === fecha ? "seleccionado" : ""}
          >
            <span>
              {DIAS[(new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7]}{" "}
              {Number(dia.slice(8))}
            </span>
          </button>
        ))}
      </div>
      <button
        className="agenda-flecha-dias"
        type="button"
        disabled={pendiente}
        onClick={() => elegir(sumarDias(fecha, 5))}
        aria-label="Cinco días siguientes"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
export function MiniCalendario({
  fecha,
  hoy,
  elegir,
}: {
  fecha: string;
  hoy: string;
  elegir: (fecha: string) => void;
}) {
  const [mes, setMes] = useState(fecha.slice(0, 7));
  const [fechaAnterior, setFechaAnterior] = useState(fecha);
  if (fecha !== fechaAnterior) {
    setFechaAnterior(fecha);
    setMes(fecha.slice(0, 7));
  }
  const primero = `${mes}-01`;
  const inicio = semanaDe(primero)[0]!;
  const cambiarMes = (cantidad: number) => {
    const d = new Date(primero + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + cantidad);
    setMes(d.toISOString().slice(0, 7));
  };
  return (
    <section className="agenda-mini" aria-label="Elegir fecha">
      <header>
        <strong>
          {new Intl.DateTimeFormat("es-AR", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(primero))}
        </strong>
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => cambiarMes(-1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => cambiarMes(1)}
        >
          <ChevronRight size={17} />
        </button>
      </header>
      <div className="agenda-mini__grilla">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <small key={i} aria-hidden="true">
            {d}
          </small>
        ))}
        {Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i)).map(
          (dia) => (
            <button
              key={dia}
              type="button"
              onClick={() => elegir(dia)}
              aria-label={dia}
              aria-pressed={dia === fecha}
              aria-current={dia === hoy ? "date" : undefined}
              className={`${dia === fecha ? "seleccionado" : ""} ${dia.slice(0, 7) !== mes ? "otro-mes" : ""}`}
            >
              {Number(dia.slice(8))}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
