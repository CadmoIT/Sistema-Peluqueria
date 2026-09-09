/** Implementa el micrositio publico y el carrito de servicios del negocio. */
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Instagram,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";
import type { NegocioPublico } from "@turnos/contratos";
import { formatearPesos } from "@turnos/config";

export function SitioNegocio({ negocio }: { negocio: NegocioPublico }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [carrito, setCarrito] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(false);
  const categorias = [
    "Todos",
    ...new Set(negocio.servicios.map((s) => s.categoria)),
  ];
  const servicios = negocio.servicios.filter(
    (s) =>
      (categoria === "Todos" || s.categoria === categoria) &&
      s.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const elegidos = negocio.servicios.filter((s) => carrito.includes(s.id));
  const total = useMemo(
    () => elegidos.reduce((s, i) => s + i.precio, 0),
    [elegidos],
  );
  function alternar(id: string) {
    setCarrito((actual) =>
      actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
    );
  }
  return (
    <div className="sitio-negocio">
      <header className="sitio-cabecera">
        <Link href={`/sitio/${negocio.slug}`} className="logo-negocio">
          MANLY<span>BARBER CLUB</span>
        </Link>
        <nav>
          <a href="#servicios">Servicios</a>
          <a href="#equipo">Equipo</a>
          <a href="#ubicacion">Ubicacion</a>
        </nav>
        <button className="boton-reservar" onClick={() => setAbierto(true)}>
          <Calendar size={17} /> Reservar turno{" "}
          {carrito.length > 0 && <b>{carrito.length}</b>}
        </button>
      </header>
      <main>
        <section className="negocio-hero">
          <div className="negocio-hero__imagen">
            <div className="sillon" />
            <div className="espejo" />
          </div>
          <div className="negocio-hero__contenido">
            <span className="estado-abierto">
              <i /> Abierto hoy hasta las 20:00
            </span>
            <h1>
              Tu estilo.
              <br />
              <em>Tu momento.</em>
            </h1>
            <p>{negocio.descripcion}</p>
            <div className="negocio-datos">
              <span>
                <Star size={15} fill="currentColor" />{" "}
                <strong>{negocio.calificacion}</strong> ({negocio.resenas}{" "}
                reseñas)
              </span>
              <span>
                <MapPin size={15} /> Palermo, Buenos Aires
              </span>
            </div>
            <button
              className="boton-negocio"
              onClick={() =>
                document.getElementById("servicios")?.scrollIntoView()
              }
            >
              Ver servicios <ChevronDown size={16} />
            </button>
          </div>
        </section>
        <section id="servicios" className="negocio-seccion">
          <div className="negocio-titulo">
            <span>SERVICIOS</span>
            <h2>Elegí como queres verte hoy.</h2>
            <p>
              Podes sumar varios servicios. Nosotros calculamos el tiempo que
              necesitas.
            </p>
          </div>
          <div className="filtros-servicio">
            <label>
              <Search size={17} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar un servicio..."
              />
            </label>
            <div>
              {categorias.map((c) => (
                <button
                  className={categoria === c ? "activo" : ""}
                  onClick={() => setCategoria(c)}
                  key={c}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="lista-servicios">
            {servicios.map((servicio, indice) => {
              const seleccionado = carrito.includes(servicio.id);
              return (
                <article
                  key={servicio.id}
                  className={seleccionado ? "seleccionado" : ""}
                >
                  <div className={`servicio-foto foto-${indice + 1}`}>
                    <span>{servicio.categoria}</span>
                  </div>
                  <div className="servicio-info">
                    <small>{servicio.categoria}</small>
                    <h3>{servicio.nombre}</h3>
                    <p>{servicio.descripcion}</p>
                    <div>
                      <span>
                        <Clock3 size={14} />
                        {servicio.duracionMinutos} min
                      </span>
                      <strong>{formatearPesos(servicio.precio)}</strong>
                    </div>
                    <button onClick={() => alternar(servicio.id)}>
                      {seleccionado ? (
                        <>
                          <Check size={16} /> Agregado
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> Agregar
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section id="equipo" className="equipo-seccion">
          <div className="negocio-titulo">
            <span>NUESTRO EQUIPO</span>
            <h2>Buenas manos. Mejor energia.</h2>
          </div>
          <div className="equipo-lista">
            {negocio.profesionales.map((p, i) => (
              <article key={p.id}>
                <div className={`profesional-foto prof-${i + 1}`}>
                  <span>{p.iniciales}</span>
                </div>
                <h3>{p.nombre}</h3>
                <p>{p.especialidad}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="ubicacion" className="ubicacion-seccion">
          <div>
            <span>ENCONTRANOS</span>
            <h2>
              Dos sedes.
              <br />
              La misma experiencia.
            </h2>
            {negocio.sedes.map((s, i) => (
              <button key={s.id}>
                <i>{i + 1}</i>
                <span>
                  <strong>{s.nombre}</strong>
                  <small>{s.direccion}</small>
                </span>
                <ChevronDown size={16} />
              </button>
            ))}
          </div>
          <div className="mapa-falso">
            <MapPin />
            <span>Buenos Aires</span>
            <i className="calle calle-1" />
            <i className="calle calle-2" />
            <i className="calle calle-3" />
          </div>
        </section>
      </main>
      <footer className="sitio-pie">
        <div className="logo-negocio">
          MANLY<span>BARBER CLUB</span>
        </div>
        <div>
          <a href="#">
            <Instagram /> Instagram
          </a>
          <a href={`tel:${negocio.telefono}`}>
            <Phone /> {negocio.telefono}
          </a>
        </div>
        <small>
          Reservas impulsadas por <b>turnosrapidos</b>
        </small>
      </footer>
      {carrito.length > 0 && !abierto && (
        <button className="carrito-flotante" onClick={() => setAbierto(true)}>
          <ShoppingBag />
          <span>
            <strong>
              {carrito.length} {carrito.length === 1 ? "servicio" : "servicios"}
            </strong>
            <small>
              {elegidos.reduce((s, i) => s + i.duracionMinutos, 0)} min en total
            </small>
          </span>
          <b>{formatearPesos(total)}</b>
        </button>
      )}
      {abierto && (
        <div className="reserva-overlay" role="dialog" aria-modal="true">
          <button
            className="cerrar-reserva"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
          >
            <X />
          </button>
          <div className="reserva-panel">
            <span className="paso-reserva">PASO 1 DE 3</span>
            <h2>Tu turno</h2>
            <p>Revisa los servicios y elegi donde queres atenderte.</p>
            {elegidos.length === 0 ? (
              <div className="vacio-carrito">
                <ShoppingBag />
                <strong>Tu seleccion esta vacia</strong>
                <button onClick={() => setAbierto(false)}>
                  Explorar servicios
                </button>
              </div>
            ) : (
              <>
                <div className="resumen-items">
                  {elegidos.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{item.nombre}</strong>
                        <small>{item.duracionMinutos} minutos</small>
                      </span>
                      <b>{formatearPesos(item.precio)}</b>
                      <button onClick={() => alternar(item.id)}>
                        <Minus />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="campo-reserva">
                  Sede
                  <select>
                    <option>Palermo Soho</option>
                    <option>Belgrano</option>
                  </select>
                </label>
                <label className="campo-reserva">
                  Profesional
                  <select>
                    <option>Cualquiera disponible</option>
                    {negocio.profesionales.map((p) => (
                      <option key={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
                <div className="reserva-total">
                  <span>Total estimado</span>
                  <strong>{formatearPesos(total)}</strong>
                </div>
                <Link
                  href={`/reservar/${negocio.slug}?servicios=${carrito.join(",")}`}
                  className="boton-negocio ancho"
                >
                  Elegir dia y horario
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
