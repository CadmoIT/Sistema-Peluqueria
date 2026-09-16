/** Renderiza el micrositio publicado con portada, catálogo, equipo, sedes y reserva. */
/* eslint-disable @next/next/no-img-element -- El origen de las imágenes pertenece a cada negocio y luego será R2. */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Star,
} from "lucide-react";

export type DatosSitioPublico = {
  slug: string;
  nombre: string;
  descripcion: string;
  configuracion: {
    titulo: string;
    descripcion: string;
    colorPrincipal: string;
    colorFondo: string;
    colorTexto: string;
    logoUrl: string;
    whatsapp: string;
    instagram: string;
    hero: Array<{ url: string; alt: string; focoX: number; focoY: number }>;
    carruselAutomatico: boolean;
    secciones: Array<"servicios" | "equipo" | "ubicacion">;
    serviciosDestacados: string[];
  };
  sedes: Array<{
    id: string;
    nombre: string;
    direccion: string;
    telefono: string | null;
    latitud: number | null;
    longitud: number | null;
    googlePuntaje: number | null;
    googleResenas: number | null;
    googleMapsUrl: string | null;
  }>;
  servicios: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    categoria: string;
    duracionMinutos: number;
    precio: number;
    imagen: string | null;
  }>;
  profesionales: Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    especialidad: string | null;
    biografia: string | null;
    foto: string | null;
  }>;
};

export function SitioPublico({ datos }: { datos: DatosSitioPublico }) {
  const [imagen, setImagen] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [servicioElegido, setServicioElegido] = useState<string | null>(null);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<string[]>([]);
  const hero = datos.configuracion.hero.filter((imagen) => imagen.url);
  useEffect(() => {
    if (!datos.configuracion.carruselAutomatico || hero.length < 2) return;
    const intervalo = window.setInterval(
      () => setImagen((actual) => (actual + 1) % hero.length),
      5_000,
    );
    return () => window.clearInterval(intervalo);
  }, [datos.configuracion.carruselAutomatico, hero.length]);
  const servicios = useMemo(
    () =>
      datos.servicios
        .filter((servicio) =>
          `${servicio.nombre} ${servicio.categoria}`
            .toLocaleLowerCase("es")
            .includes(busqueda.toLocaleLowerCase("es")),
        )
        .sort(
          (a, b) =>
            posicionDestacado(a.id, datos.configuracion.serviciosDestacados) -
            posicionDestacado(b.id, datos.configuracion.serviciosDestacados),
        ),
    [busqueda, datos.configuracion.serviciosDestacados, datos.servicios],
  );
  const categorias = useMemo(
    () =>
      servicios.reduce<Record<string, typeof servicios>>((grupos, servicio) => {
        (grupos[servicio.categoria] ??= []).push(servicio);
        return grupos;
      }, {}),
    [servicios],
  );
  const nombresCategorias = useMemo(
    () => Object.keys(categorias),
    [categorias],
  );
  useEffect(() => {
    if (busqueda) {
      setCategoriasAbiertas(nombresCategorias);
      return;
    }
    setCategoriasAbiertas((actuales) =>
      actuales.length ? actuales : nombresCategorias.slice(0, 1),
    );
  }, [busqueda, nombresCategorias]);
  const estilo = {
    "--sitio-principal": datos.configuracion.colorPrincipal,
    "--sitio-fondo": datos.configuracion.colorFondo,
    "--sitio-texto": datos.configuracion.colorTexto,
  } as React.CSSProperties;
  const sedePrincipal = datos.sedes[0];

  return (
    <div className="publico-sitio" style={estilo}>
      <main>
        <section
          className={`publico-hero ${hero.length ? "con-imagen" : ""}`}
          aria-label={hero[imagen]?.alt || undefined}
          style={
            hero[imagen]
              ? {
                  backgroundImage: `url(${hero[imagen].url})`,
                  backgroundPosition: `${hero[imagen].focoX}% ${hero[imagen].focoY}%`,
                }
              : undefined
          }
        >
          <div className="publico-hero__velo" />
          {datos.configuracion.logoUrl && (
            <img
              className="publico-logo-portada"
              src={datos.configuracion.logoUrl}
              alt={datos.configuracion.titulo}
            />
          )}
          <div className="publico-hero__contenido">
            <small>RESERVAS ONLINE</small>
            <h1>{datos.configuracion.titulo}</h1>
            <p>{datos.configuracion.descripcion || datos.descripcion}</p>
            <Link className="publico-boton" href={`/reservar/${datos.slug}`}>
              Elegir día y horario
            </Link>
          </div>
          {hero.length > 1 && (
            <div className="hero-controles">
              <button
                onClick={() =>
                  setImagen((imagen - 1 + hero.length) % hero.length)
                }
                aria-label="Imagen anterior"
              >
                <ChevronLeft />
              </button>
              <span>
                {imagen + 1} / {hero.length}
              </span>
              <button
                onClick={() => setImagen((imagen + 1) % hero.length)}
                aria-label="Imagen siguiente"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </section>
        {datos.configuracion.secciones.includes("servicios") && (
          <section
            className="publico-seccion"
            id="servicios"
            style={{
              order: datos.configuracion.secciones.indexOf("servicios"),
            }}
          >
            <div className="publico-titulo">
              <small>SERVICIOS</small>
              <h2>Elegí tu próximo turno</h2>
              <p>Consultá duración y precio antes de reservar.</p>
            </div>
            <label className="publico-buscador">
              <Search />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar un servicio"
              />
            </label>
            <div className="publico-catalogo">
              <aside aria-label="Categorías de servicios">
                {nombresCategorias.map((categoria) => (
                  <button
                    type="button"
                    key={categoria}
                    onClick={() =>
                      document
                        .getElementById("categoria-" + categoria)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                    }
                  >
                    {categoria}
                  </button>
                ))}
              </aside>
              <div className="publico-categorias">
                {Object.entries(categorias).map(([categoria, items]) => {
                  const abierta = categoriasAbiertas.includes(categoria);
                  return (
                    <details
                      id={"categoria-" + categoria}
                      key={categoria}
                      open={abierta}
                      onToggle={(evento) => {
                        const mostrar = evento.currentTarget.open;
                        setCategoriasAbiertas((actuales) =>
                          mostrar
                            ? Array.from(new Set([...actuales, categoria]))
                            : actuales.filter((item) => item !== categoria),
                        );
                      }}
                    >
                      <summary>
                        <strong>{categoria}</strong>
                        <span>{abierta ? "−" : "+"}</span>
                      </summary>
                      <div>
                        {items.map((servicio) => (
                          <article
                            key={servicio.id}
                            className={
                              servicioElegido === servicio.id ? "elegido" : ""
                            }
                          >
                            <small>{servicio.duracionMinutos} min</small>
                            <h3>{servicio.nombre}</h3>
                            <p>
                              {servicio.descripcion ||
                                "Consultá disponibilidad para este servicio."}
                            </p>
                            <footer>
                              <strong>{pesos(servicio.precio)}</strong>
                              <button
                                type="button"
                                className="publico-seleccionar"
                                aria-pressed={servicioElegido === servicio.id}
                                onClick={() => setServicioElegido(servicio.id)}
                              >
                                {servicioElegido === servicio.id
                                  ? "Seleccionado"
                                  : "Seleccionar"}
                              </button>
                              <Link
                                href={
                                  "/reservar/" +
                                  datos.slug +
                                  "?servicios=" +
                                  servicio.id
                                }
                              >
                                Reservar
                              </Link>
                            </footer>
                          </article>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
            {!servicios.length && (
              <p className="publico-sin-resultados">
                No encontramos servicios con ese nombre.
              </p>
            )}
          </section>
        )}
        {!!datos.profesionales.length &&
          datos.configuracion.secciones.includes("equipo") && (
            <section
              className="publico-seccion publico-equipo"
              id="equipo"
              style={{ order: datos.configuracion.secciones.indexOf("equipo") }}
            >
              <div className="publico-titulo">
                <small>EQUIPO</small>
                <h2>Conocé a quienes te van a atender</h2>
              </div>
              <div>
                {datos.profesionales.map((profesional) => (
                  <article key={profesional.id}>
                    {profesional.foto ? (
                      <img
                        src={profesional.foto}
                        alt={`${profesional.nombre} ${profesional.apellido ?? ""}`}
                      />
                    ) : (
                      <i>
                        {iniciales(profesional.nombre, profesional.apellido)}
                      </i>
                    )}
                    <h3>
                      {profesional.nombre} {profesional.apellido}
                    </h3>
                    <p>
                      {profesional.especialidad ||
                        profesional.biografia ||
                        "Profesional del equipo"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        {!!datos.sedes.length &&
          datos.configuracion.secciones.includes("ubicacion") && (
            <section
              className="publico-ubicacion"
              id="ubicacion"
              style={{
                order: datos.configuracion.secciones.indexOf("ubicacion"),
              }}
            >
              <div className="publico-ubicacion__datos">
                <small>ENCONTRANOS</small>
                <h2>
                  {datos.sedes.length === 1 ? "Te esperamos" : "Elegí tu sede"}
                </h2>
                {datos.sedes.map((sede) => (
                  <article key={sede.id}>
                    <h3>{sede.nombre}</h3>
                    <span>
                      <MapPin /> {sede.direccion || "Dirección pendiente"}
                    </span>
                    {sede.telefono && (
                      <a href={`tel:${sede.telefono}`}>
                        <Phone /> {sede.telefono}
                      </a>
                    )}
                    {sede.googlePuntaje !== null && sede.googleMapsUrl && (
                      <a
                        href={sede.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Star fill="currentColor" /> {sede.googlePuntaje} ·{" "}
                        {sede.googleResenas ?? 0} valoraciones <ExternalLink />
                      </a>
                    )}
                  </article>
                ))}
              </div>
              {sedePrincipal && (
                <iframe
                  title={`Mapa de ${sedePrincipal.nombre}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(sedePrincipal.direccion || datos.nombre)}&output=embed`}
                />
              )}
            </section>
          )}
      </main>
      <footer className="publico-footer">
        <strong>{datos.configuracion.titulo}</strong>
        <span>Reservas impulsadas por TurnosRápidos</span>
      </footer>
      {datos.configuracion.whatsapp.replace(/\D/g, "").length >= 8 && (
        <a
          className="whatsapp-flotante"
          href={`https://wa.me/${datos.configuracion.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle />
        </a>
      )}
      {servicioElegido && (
        <Link
          className="reserva-movil-persistente"
          href={"/reservar/" + datos.slug + "?servicios=" + servicioElegido}
        >
          <CalendarDays /> Reservar servicio
        </Link>
      )}
    </div>
  );
}

export function SitioSuspendido({
  nombre,
  precio,
}: {
  nombre: string;
  precio: number;
}) {
  return (
    <main className="sitio-suspendido">
      <div className="sitio-suspendido__marca">TurnosRápidos</div>
      <section>
        <Clock3 />
        <small>PRUEBA FINALIZADA</small>
        <h1>{nombre} conserva toda su configuración</h1>
        <p>
          Para volver a publicar la página y recibir reservas, activá el plan
          mensual.
        </p>
        <strong>
          {pesos(precio)}
          <span>/mes</span>
        </strong>
        <a className="publico-boton" href="/precios">
          Activar con Mercado Pago
        </a>
        <small>
          El sitio se habilita automáticamente cuando recibimos la confirmación
          del pago.
        </small>
      </section>
    </main>
  );
}

function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
function iniciales(nombre: string, apellido: string | null) {
  return `${nombre[0] ?? ""}${apellido?.[0] ?? ""}`.toUpperCase();
}

function posicionDestacado(id: string, destacados: string[]) {
  const posicion = destacados.indexOf(id);
  return posicion === -1 ? Number.MAX_SAFE_INTEGER : posicion;
}
