/** Renderiza el resumen operativo con metricas, agenda y tareas del negocio. */
"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Menu,
  Plus,
  Search,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { Etiqueta } from "@turnos/ui";
import { turnosHoy } from "../../datos/demo";
import { NavegacionPanel } from "./navegacion-panel";

export function PanelPrincipal() {
  const [menu, setMenu] = useState(false);
  const [saludo, setSaludo] = useState("Buen dia, Lucia");
  return (
    <div className="panel-shell">
      <div
        className={menu ? "panel-overlay visible" : "panel-overlay"}
        onClick={() => setMenu(false)}
      />
      <div className={menu ? "panel-mobile abierto" : "panel-mobile"}>
        <button onClick={() => setMenu(false)} aria-label="Cerrar menu">
          <X />
        </button>
        <NavegacionPanel />
      </div>
      <NavegacionPanel />
      <main className="panel-main">
        <header className="panel-top">
          <button
            className="icono-boton menu-mobile"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          <button className="selector-sede">
            Palermo Soho <ChevronDown size={15} />
          </button>
          <div className="panel-top__acciones">
            <label className="buscar">
              <Search size={17} />
              <input placeholder="Buscar cliente, turno..." />
            </label>
            <button className="icono-boton" aria-label="Notificaciones">
              <Bell size={19} />
              <i />
            </button>
            <a
              href="/sitio/manly-barber"
              className="boton boton--secundario"
              target="_blank"
            >
              Ver mi sitio <ExternalLink size={16} />
            </a>
          </div>
        </header>
        <div className="panel-contenido">
          <section className="panel-bienvenida">
            <div>
              <p>Martes, 8 de septiembre</p>
              <h1>
                {saludo} <span>👋</span>
              </h1>
              <small>
                Tu negocio esta al dia. Tenes 24 turnos programados.
              </small>
            </div>
            <button
              className="boton boton--primario"
              onClick={() => setSaludo("Nuevo turno listo para cargar")}
            >
              <Plus size={18} /> Nuevo turno
            </button>
          </section>
          <section className="metricas-panel">
            <article>
              <span className="metrica-icono verde">
                <CalendarDays />
              </span>
              <div>
                <small>Turnos de hoy</small>
                <strong>24</strong>
                <em>
                  <TrendingUp /> 12% vs. martes anterior
                </em>
              </div>
            </article>
            <article>
              <span className="metrica-icono azul">
                <UsersRound />
              </span>
              <div>
                <small>Ocupacion</small>
                <strong>86%</strong>
                <em>
                  <TrendingUp /> 8% esta semana
                </em>
              </div>
            </article>
            <article>
              <span className="metrica-icono naranja">
                <CircleDollarSign />
              </span>
              <div>
                <small>Ingresos del mes</small>
                <strong>$284.500</strong>
                <em>
                  <TrendingUp /> 18% vs. mes anterior
                </em>
              </div>
            </article>
            <article>
              <span className="metrica-icono violeta">
                <Clock3 />
              </span>
              <div>
                <small>Proximo turno</small>
                <strong className="proxima-hora">09:30</strong>
                <em className="gris">en 18 minutos</em>
              </div>
            </article>
          </section>
          <div className="panel-grilla">
            <section className="modulo agenda-modulo">
              <div className="modulo__titulo">
                <div>
                  <h2>Agenda de hoy</h2>
                  <p>24 turnos · 3 profesionales</p>
                </div>
                <button>
                  Ver agenda completa <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="tabla-turnos">
                <div className="tabla-turnos__cabecera">
                  <span>Hora</span>
                  <span>Cliente</span>
                  <span>Servicio</span>
                  <span>Profesional</span>
                  <span>Estado</span>
                </div>
                {turnosHoy.map((turno) => (
                  <div className="tabla-turnos__fila" key={turno.hora}>
                    <strong>{turno.hora}</strong>
                    <span className="cliente-tabla">
                      <i>
                        {turno.cliente
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </i>
                      {turno.cliente}
                    </span>
                    <span>{turno.servicio}</span>
                    <span>{turno.profesional}</span>
                    <Etiqueta
                      tono={
                        turno.estado === "Pendiente"
                          ? "neutro"
                          : turno.estado === "En el salon"
                            ? "azul"
                            : "verde"
                      }
                    >
                      {turno.estado}
                    </Etiqueta>
                  </div>
                ))}
              </div>
            </section>
            <aside className="modulo proximos">
              <div className="modulo__titulo">
                <div>
                  <h2>Proximos</h2>
                  <p>Lo que requiere atencion</p>
                </div>
              </div>
              <div className="tarea">
                <span className="tarea__fecha">
                  09<small>SEP</small>
                </span>
                <div>
                  <strong>5 recordatorios</strong>
                  <p>Se enviaran mañana a las 10:00</p>
                </div>
              </div>
              <div className="tarea">
                <span className="tarea__fecha alerta">
                  3<small>PROD.</small>
                </span>
                <div>
                  <strong>Stock bajo</strong>
                  <p>Cera mate y 2 productos mas</p>
                </div>
              </div>
              <div className="tarea">
                <span className="tarea__fecha">
                  12<small>SEP</small>
                </span>
                <div>
                  <strong>Cierre de comisiones</strong>
                  <p>Periodo del 1 al 15 de septiembre</p>
                </div>
              </div>
              <button className="boton boton--secundario ancho">
                Ver todas las tareas
              </button>
            </aside>
          </div>
          <section className="publicacion">
            <div className="publicacion__icono">T</div>
            <div>
              <strong>Tu pagina esta en modo vista previa</strong>
              <p>
                Completa 2 pasos mas y elegi un plan para compartirla con tus
                clientes.
              </p>
              <div className="progreso">
                <i />
              </div>
            </div>
            <span>6 de 8 pasos</span>
            <a className="boton boton--primario" href="/panel/configuracion">
              Continuar configuracion
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
