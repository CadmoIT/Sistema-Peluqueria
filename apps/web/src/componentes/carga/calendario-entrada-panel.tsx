/** Pasa hojas sujetas a dos aros y confirma el ingreso solamente cuando la vista está lista. */
"use client";

import { memo, useId, useLayoutEffect, useRef, useState } from "react";
import { calcularHojaCurvada } from "./cinematica-hoja";
import {
  avanzarCalendario,
  type TiempoCalendario,
} from "./linea-tiempo-calendario";
import "./calendario-entrada-panel.css";

const meses = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function HojaCalendario({
  mes,
  gradiente,
  seleccionado,
  avance = 0,
  ano,
  diaSeleccionado,
  mesDelAno,
}: {
  mes: number;
  gradiente: string;
  seleccionado: boolean;
  avance?: number;
  ano: number;
  diaSeleccionado: number;
  mesDelAno: number;
}) {
  const id = useId().replaceAll(":", "");
  const hoja = calcularHojaCurvada(avance);
  return (
    <svg viewBox="0 0 208 204" fill="none">
      <defs>
        <clipPath id={`hoja-frente-${id}`}>
          <path className="entrada-hoja__recorte" d={hoja.frente} />
        </clipPath>
        <linearGradient id={`hoja-doblez-${id}`} x1="1" y1="0" x2="0" y2="1">
          <stop stopColor="#b7ccd6" />
          <stop offset=".22" stopColor="#fff" />
          <stop offset=".6" stopColor="#f6fbfd" />
          <stop offset="1" stopColor="#93adb9" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#hoja-frente-${id})`} opacity={hoja.reverso ? 0 : 1}>
        <rect
          x="1"
          y="1"
          width="206"
          height="202"
          rx="12"
          fill="#fff"
          stroke="#dae9ed"
          strokeWidth="2"
        />
        <path
          d="M13 1h182a12 12 0 0 1 12 12v34H1V13A12 12 0 0 1 13 1Z"
          fill={`url(#${gradiente})`}
        />
        <text
          x="104"
          y="33"
          textAnchor="middle"
          fill="white"
          fontSize="23"
          fontWeight="700"
          letterSpacing="3"
        >
          {meses[mesDelAno]} {ano}
        </text>
        {["L", "M", "M", "J", "V", "S", "D"].map((dia, i) => (
          <text
            key={i}
            x={27 + i * 25.5}
            y="65"
            textAnchor="middle"
            fill="#8a9ea8"
            fontSize="9"
          >
            {dia}
          </text>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const x = 17 + (i % 7) * 25.5,
            y = 75 + Math.floor(i / 7) * 27;
          const diasDelMes = new Date(ano, mesDelAno + 1, 0).getDate();
          if (i >= diasDelMes) return <g key={i} />;
          const turno = (i + mes * 3) % 9 === 0;
          const elegido = seleccionado && i + 1 === diaSeleccionado;
          return (
            <g
              key={i}
              className={elegido ? "entrada-hoja__dia-elegido" : undefined}
            >
              <rect
                x={x}
                y={y}
                width="20"
                height="20"
                rx="6"
                fill={elegido ? "#13b8d4" : turno ? "#ddf6fa" : "#f2f6f7"}
              />
              <text
                x={x + 10}
                y={y + 13.5}
                textAnchor="middle"
                fill={elegido ? "#fff" : turno ? "#08758b" : "#79919d"}
                fontSize="9"
                fontWeight={turno || elegido ? "700" : "400"}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        <path
          d="M25 191h96"
          stroke="#e3eef1"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      {avance > 0 && !hoja.reverso && (
        <g className="entrada-hoja__doblez">
          <path
            d={hoja.pliegue}
            fill="#08324f"
            opacity=".12"
            transform="translate(2 4)"
          />
          <path
            className="entrada-hoja__papel-curvo"
            d={hoja.pliegue}
            fill={`url(#hoja-doblez-${id})`}
            stroke="#9fb8c3"
            strokeWidth=".7"
          />
          <path
            d={hoja.borde}
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      )}
      {hoja.reverso && (
        <g className="entrada-hoja__reverso">
          <rect
            x="1"
            y="1"
            width="206"
            height="202"
            rx="12"
            fill="#edf5f8"
            stroke="#b4cbd6"
            strokeWidth="1.5"
          />
          <path d="M16 20H192" stroke="#d6e5eb" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

const HojaMemorizada = memo(HojaCalendario);

/** La secuencia no se reinicia ni detiene al cambiar de hoja. */
function useLineaDeTiempo(listo: boolean, onFinalizar: () => void) {
  const [tiempo, cambiarTiempo] = useState<TiempoCalendario>({
    instante: 0,
    destino: null,
    confirmacion: null,
  });
  const listoActual = useRef(listo);
  const finalizarActual = useRef(onFinalizar);
  listoActual.current = listo;
  finalizarActual.current = onFinalizar;
  useLayoutEffect(() => {
    let anterior = performance.now();
    let transcurrido: TiempoCalendario = {
      instante: 0,
      destino: null,
      confirmacion: null,
    };
    let frame: number;
    const mover = (ahora: number) => {
      const delta = Math.min(64, Math.max(0, ahora - anterior));
      anterior = ahora;
      transcurrido = avanzarCalendario(
        transcurrido,
        delta,
        listoActual.current,
      );
      cambiarTiempo(transcurrido);
      if (
        transcurrido.confirmacion !== null &&
        transcurrido.confirmacion >= 500
      )
        finalizarActual.current();
      else frame = requestAnimationFrame(mover);
    };
    frame = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(frame);
  }, []);
  return tiempo;
}

export function CalendarioEntradaPanel({
  listo,
  onFinalizar,
}: {
  listo: boolean;
  onFinalizar: () => void;
}) {
  const id = useId().replaceAll(":", "");
  const fechaInicio = useRef(new Date()).current;
  const { instante, confirmacion } = useLineaDeTiempo(listo, onFinalizar);
  const mes = Math.floor(instante / 500);
  const mesDelAno = (fechaInicio.getMonth() + mes) % 12;
  const ano =
    fechaInicio.getFullYear() + Math.floor((fechaInicio.getMonth() + mes) / 12);
  const avance = Math.min(1, (instante - mes * 500) / 500);
  const confirmado = confirmacion !== null;
  const pasando = !confirmado;
  const saliendo = confirmado && confirmacion >= 360;

  const gradiente = `entrada-cabecera-${id}`;
  return (
    <div
      className={`carga-pantalla carga-pantalla--panel${saliendo ? " carga-pantalla--saliendo" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando tu panel"
      data-testid="carga-aplicacion"
      data-tipo="panel"
    >
      <div className="carga-pantalla__centro">
        <div
          className={`entrada-calendario${pasando ? " entrada-calendario--pasando" : ""}${confirmado ? " entrada-calendario--confirmado" : ""}`}
          data-testid="calendario-entrada"
          data-mes={meses[mesDelAno]}
          data-ano={ano}
          data-listo={listo}
          data-fase={
            saliendo
              ? "salida"
              : confirmado
                ? "confirmacion"
                : pasando
                  ? "giro"
                  : "hoja"
          }
          aria-hidden="true"
        >
          <svg
            className="entrada-calendario__base"
            viewBox="0 0 320 300"
            fill="none"
          >
            <defs>
              <linearGradient
                id={gradiente}
                x1="0"
                y1="0"
                x2="208"
                y2="47"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#08324f" />
                <stop offset="1" stopColor="#13b8d4" />
              </linearGradient>
              <linearGradient
                id={`entrada-base-${id}`}
                x1="66"
                y1="68"
                x2="269"
                y2="253"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#13758d" />
                <stop offset="1" stopColor="#08324f" />
              </linearGradient>
            </defs>
            <ellipse
              cx="159"
              cy="272"
              rx="120"
              ry="12"
              fill="#08324f"
              opacity=".07"
            />
            <path
              d="M91 45h133l52 210H39L91 45Z"
              fill={`url(#entrada-base-${id})`}
            />
            <path d="M224 45 276 255h-28L209 45h15Z" fill="#06273d" />
            <path d="M39 252h237l-14 14H51L39 252Z" fill="#0b5068" />
            <path
              d="M48 253h218"
              stroke="#4ca6b8"
              strokeWidth="2"
              opacity=".6"
            />
            <rect
              x="56"
              y="50"
              width="208"
              height="204"
              rx="13"
              fill="#b9d7df"
            />
            <rect
              x="56"
              y="47"
              width="208"
              height="204"
              rx="13"
              fill="#e6f0f3"
            />
          </svg>
          <div className="entrada-calendario__hojas">
            {(mes === 0 ? [0, 1] : [mes - 1, mes, mes + 1]).map((indice) => {
              const activa = indice === mes;
              const progreso =
                indice === mes && pasando ? avance : indice < mes ? 1 : 0;
              // La hoja siguiente conserva su posición y su nodo al pasar al frente.
              // La saliente se desvanece detrás antes del límite, nunca se corta visible.
              const salida = Math.max(0, Math.min(1, (progreso - 0.82) / 0.18));
              const opacidad =
                indice < mes ? 0 : 1 - salida * salida * (3 - 2 * salida);
              return (
                <div
                  key={indice}
                  className={`entrada-hoja${activa && pasando ? " entrada-hoja--vuelo" : ""}`}
                  data-hoja-mes={meses[indice % 12]}
                  data-avance={progreso.toFixed(3)}
                  style={{
                    zIndex: indice === mes ? 12 : indice === mes + 1 ? 11 : 10,
                    visibility: "visible",
                    opacity: opacidad,
                    transform: calcularHojaCurvada(progreso).transform,
                  }}
                >
                  <HojaMemorizada
                    mes={indice}
                    gradiente={gradiente}
                    seleccionado={activa && (confirmado || indice === 0)}
                    avance={progreso}
                    ano={
                      fechaInicio.getFullYear() +
                      Math.floor((fechaInicio.getMonth() + indice) / 12)
                    }
                    diaSeleccionado={fechaInicio.getDate()}
                    mesDelAno={(fechaInicio.getMonth() + indice) % 12}
                  />
                </div>
              );
            })}
          </div>
          <svg
            className="entrada-calendario__aros"
            viewBox="0 0 320 300"
            fill="none"
          >
            {[103, 216].map((x) => (
              <g key={x}>
                <path
                  d={`M${x - 7} 61V34a9 9 0 0 1 18 0v18`}
                  stroke="#05293e"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d={`M${x - 8} 52V34a8 8 0 0 1 13-6`}
                  stroke="#5bb0c1"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
          {confirmado && (
            <svg
              className="entrada-calendario__check"
              viewBox="0 0 320 300"
              fill="none"
            >
              <circle cx="160" cy="153" r="76" fill="#fff" opacity=".93" />
              <path
                d="m102 153 42 39 86-84"
                pathLength="1"
                stroke="#0c9db7"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <p className="carga-pantalla__marca">
          Turnos<span>Rápidos</span>
        </p>
        <p className="carga-pantalla__mensaje">
          {confirmado ? "Tu agenda está lista" : "Preparando tu agenda…"}
        </p>
      </div>
    </div>
  );
}
