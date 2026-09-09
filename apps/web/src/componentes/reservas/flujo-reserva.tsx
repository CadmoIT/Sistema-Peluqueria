/** Guía al cliente por fecha, datos personales y confirmación de una reserva. */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { formatearPesos } from "@turnos/config";
import { negocioDemo } from "../../datos/demo";

const dias = [
  { d: "MIÉ", n: 9 },
  { d: "JUE", n: 10 },
  { d: "VIE", n: 11 },
  { d: "SÁB", n: 12 },
  { d: "LUN", n: 14 },
];
const horarios = [
  "09:00",
  "09:45",
  "10:30",
  "11:15",
  "12:00",
  "14:30",
  "15:15",
  "16:00",
  "17:30",
];

export function FlujoReserva({ servicioIds }: { servicioIds: string[] }) {
  const seleccionados = negocioDemo.servicios.filter((servicio) =>
    servicioIds.includes(servicio.id),
  );
  const servicios = seleccionados.length
    ? seleccionados
    : [negocioDemo.servicios[2]!];
  const duracion = servicios.reduce(
    (total, servicio) => total + servicio.duracionMinutos,
    0,
  );
  const total = servicios.reduce(
    (acumulado, servicio) => acumulado + servicio.precio,
    0,
  );
  const sena = Math.round(total * 0.3);
  const resumen = servicios.map((servicio) => servicio.nombre).join(" + ");
  const [dia, setDia] = useState(10);
  const [hora, setHora] = useState("");
  const [paso, setPaso] = useState(1);
  const [confirmado, setConfirmado] = useState(false);

  if (confirmado) {
    return (
      <main className="reserva-exito">
        <span>
          <Check />
        </span>
        <small>RESERVA CONFIRMADA</small>
        <h1>Nos vemos pronto.</h1>
        <p>
          Te enviamos los detalles y el enlace para gestionar tu turno por
          email.
        </p>
        <div>
          <strong>
            Jueves {dia} de septiembre · {hora}
          </strong>
          <small>{resumen} · Franco</small>
          <small>Manly Barber Club, Palermo Soho</small>
        </div>
        <Link className="boton boton--primario" href="/sitio/manly-barber">
          Volver al sitio
        </Link>
      </main>
    );
  }

  return (
    <main className="flujo-reserva">
      <aside>
        <Link href="/sitio/manly-barber">
          <ArrowLeft /> Volver
        </Link>
        <div className="logo-reserva">
          MANLY<span>BARBER CLUB</span>
        </div>
        <div className="resumen-reserva">
          <small>TU RESERVA</small>
          <h2>{resumen}</h2>
          <p>
            <Clock3 /> {duracion} minutos
          </p>
          <p>
            <MapPin /> Palermo Soho
          </p>
          <hr />
          <div>
            <span>Servicios</span>
            <b>{formatearPesos(total)}</b>
          </div>
          <div>
            <span>Seña para reservar</span>
            <b>{formatearPesos(sena)}</b>
          </div>
          <small className="nota-sena">El saldo se abona en el local.</small>
        </div>
        <p className="seguro">
          <ShieldCheck /> Reserva protegida por TurnosRapidos
        </p>
      </aside>

      <section className="selector-turno">
        <div className="progreso-pasos">
          <i className="activo">1</i>
          <span />
          <i className={paso >= 2 ? "activo" : ""}>2</i>
          <span />
          <i>3</i>
        </div>
        {paso === 1 ? (
          <>
            <small>PASO 1 DE 3</small>
            <h1>Elegí día y horario</h1>
            <p>Horarios disponibles con Franco.</p>
            <div className="mes-reserva">
              <button aria-label="Mes anterior">
                <ChevronLeft />
              </button>
              <strong>Septiembre 2026</strong>
              <button aria-label="Mes siguiente">
                <ChevronRight />
              </button>
            </div>
            <div className="dias-reserva">
              {dias.map((item) => (
                <button
                  className={dia === item.n ? "activo" : ""}
                  onClick={() => setDia(item.n)}
                  key={item.n}
                >
                  <small>{item.d}</small>
                  <strong>{item.n}</strong>
                </button>
              ))}
            </div>
            <h3>Horarios disponibles</h3>
            <div className="horas-reserva">
              {horarios.map((item) => (
                <button
                  className={hora === item ? "activo" : ""}
                  onClick={() => setHora(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              disabled={!hora}
              className="boton boton--primario continuar"
              onClick={() => setPaso(2)}
            >
              Continuar
            </button>
          </>
        ) : (
          <>
            <small>PASO 2 DE 3</small>
            <h1>Contanos quién sos</h1>
            <p>Usaremos estos datos sólo para gestionar tu turno.</p>
            <form
              className="datos-cliente"
              onSubmit={(evento) => {
                evento.preventDefault();
                setConfirmado(true);
              }}
            >
              <label>
                Nombre y apellido
                <input
                  required
                  autoComplete="name"
                  placeholder="Ej. Sofía Martínez"
                />
              </label>
              <label>
                Celular
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="11 1234 5678"
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="sofia@email.com"
                />
              </label>
              <label className="consentimiento">
                <input required type="checkbox" /> Acepto recibir confirmaciones
                relacionadas con esta reserva.
              </label>
              <button className="boton boton--primario continuar" type="submit">
                Confirmar reserva de prueba
              </button>
              <button
                className="volver-paso"
                type="button"
                onClick={() => setPaso(1)}
              >
                Volver al horario
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
