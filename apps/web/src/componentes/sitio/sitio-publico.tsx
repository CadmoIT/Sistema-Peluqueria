/** Renderiza el micrositio publicado con portada, catálogo, equipo, sedes y reserva. */
/* eslint-disable @next/next/no-img-element -- El origen de las imágenes pertenece a cada negocio y luego será R2. */
"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

export type DatosSitioPublico = {
  slug: string;
  nombre: string;
  descripcion: string;
  politicaContacto: "EMAIL" | "TELEFONO" | "CUALQUIERA" | "NINGUNO";
  configuracion: {
    titulo: string;
    descripcion: string;
    colorPrincipal: string;
    colorFondo: string;
    colorTexto: string;
    logoUrl: string;
    heroAlineacion: "izquierda" | "centro" | "derecha";
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
    subdominio: string | null;
    direccion: string;
    telefono: string | null;
    latitud: number | null;
    longitud: number | null;
    googlePuntaje: number | null;
    googleResenas: number | null;
    googleMapsUrl: string | null;
    horarios: Array<{
      diaSemana: number;
      abre: string;
      cierra: string;
      activo: boolean;
    }>;
  }>;
  servicios: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    categoria: string;
    duracionMinutos: number;
    precio: number;
    imagen: string | null;
    sedeIds: string[];
    profesionalIds: string[];
  }>;
  profesionales: Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    especialidad: string | null;
    biografia: string | null;
    foto: string | null;
    sedeIds: string[];
    servicioIds: string[];
  }>;
};

export function SitioPublico({ datos }: { datos: DatosSitioPublico }) {
  const [imagen, setImagen] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [serviciosElegidos, setServiciosElegidos] = useState<string[]>([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);
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
    setCategoriaAbierta((actual) =>
      busqueda
        ? (nombresCategorias[0] ?? null)
        : actual && nombresCategorias.includes(actual)
          ? actual
          : (nombresCategorias[0] ?? null),
    );
  }, [busqueda, nombresCategorias]);
  const serviciosSeleccionados = datos.servicios.filter((servicio) =>
    serviciosElegidos.includes(servicio.id),
  );
  const [mostrarReserva, setMostrarReserva] = useState(false);
  const totalSeleccionado = serviciosSeleccionados.reduce(
    (total, servicio) => total + servicio.precio,
    0,
  );
  const estilo = {
    "--sitio-principal": datos.configuracion.colorPrincipal,
    "--sitio-fondo": datos.configuracion.colorFondo,
    "--sitio-texto": datos.configuracion.colorTexto,
  } as React.CSSProperties;
  const sedePrincipal = datos.sedes[0]!;

  return (
    <div className="publico-sitio" style={estilo}>
      <main>
        <section
          className={`publico-hero publico-hero--${datos.configuracion.heroAlineacion} ${hero.length ? "con-imagen" : ""}`}
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
          <div className="publico-hero__contenido">
            <small>RESERVAS ONLINE</small>
            <h1>{datos.configuracion.titulo}</h1>
            <p>{datos.configuracion.descripcion || datos.descripcion}</p>
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
          <section className="publico-experiencia" id="servicios">
            <div className="publico-catalogo-col">
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
                  placeholder="Buscar un servicio (ej. corte, uñas, masaje...)"
                />
              </label>
              <nav
                className="publico-categorias-nav"
                aria-label="Categorías de servicios"
              >
                {nombresCategorias.map((categoria) => (
                  <button
                    type="button"
                    key={categoria}
                    onClick={() => {
                      setCategoriaAbierta(categoria);
                      document
                        .getElementById("categoria-" + categoria)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }}
                  >
                    {categoria}
                  </button>
                ))}
              </nav>
              <div className="publico-categorias">
                {Object.entries(categorias).map(([categoria, items]) => {
                  const abierta = categoriaAbierta === categoria;
                  return (
                    <details
                      id={"categoria-" + categoria}
                      key={categoria}
                      open={abierta}
                      onToggle={(evento) => {
                        setCategoriaAbierta(
                          evento.currentTarget.open ? categoria : null,
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
                              serviciosElegidos.includes(servicio.id)
                                ? "elegido"
                                : ""
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
                                aria-label={`${serviciosElegidos.includes(servicio.id) ? "Quitar" : "Agregar"} ${servicio.nombre}`}
                                aria-pressed={serviciosElegidos.includes(
                                  servicio.id,
                                )}
                                onClick={() =>
                                  setServiciosElegidos((actuales) =>
                                    actuales.includes(servicio.id)
                                      ? actuales.filter(
                                          (id) => id !== servicio.id,
                                        )
                                      : [...actuales, servicio.id],
                                  )
                                }
                              >
                                {serviciosElegidos.includes(servicio.id)
                                  ? "Quitar"
                                  : "Reservar"}
                              </button>
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
            <aside
              className="publico-lateral"
              aria-label="Información del local"
            >
              {sedePrincipal && (
                <div className="publico-lateral__local">
                  <div className="publico-lateral__mapa">
                    <iframe
                      title={`Mapa de ${sedePrincipal.nombre}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(sedePrincipal.direccion || datos.nombre)}&output=embed`}
                    />
                  </div>
                  <div className="publico-lateral__datos">
                    <strong>{sedePrincipal.nombre}</strong>
                    <span>
                      <MapPin />{" "}
                      {sedePrincipal.direccion || "Dirección pendiente"}
                    </span>
                    {sedePrincipal.telefono && (
                      <a
                        href={`https://wa.me/${sedePrincipal.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaWhatsapp /> {sedePrincipal.telefono}
                      </a>
                    )}
                    <details className="publico-horarios">
                      <summary>Horarios</summary>
                      <div role="tooltip">
                        {sedePrincipal.horarios
                          .filter((horario) => horario.activo)
                          .map((horario) => (
                            <span key={horario.diaSemana}>
                              {nombreDia(horario.diaSemana)} · {horario.abre} a{" "}
                              {horario.cierra}
                            </span>
                          ))}
                      </div>
                    </details>
                    {sedePrincipal.googlePuntaje !== null && (
                      <span>
                        <Star fill="currentColor" />{" "}
                        {sedePrincipal.googlePuntaje} ·{" "}
                        {sedePrincipal.googleResenas ?? 0} valoraciones
                      </span>
                    )}
                  </div>
                </div>
              )}
              <section className="publico-equipo-minimal">
                <div className="publico-lateral__titulo">
                  <h2>Nuestro equipo</h2>
                  <span>Profesionales que te cuidan</span>
                </div>
                <div className="publico-equipo-grid">
                  {datos.profesionales.map((profesional) => (
                    <article
                      key={profesional.id}
                      title={`${profesional.nombre} ${profesional.apellido ?? ""}`.trim()}
                    >
                      {profesional.foto ? (
                        <img src={profesional.foto} alt="" />
                      ) : (
                        <i>
                          {iniciales(profesional.nombre, profesional.apellido)}
                        </i>
                      )}
                      <strong>{profesional.nombre}</strong>
                      <small>{profesional.especialidad ?? "Profesional"}</small>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        )}
      </main>
      {serviciosSeleccionados.length > 0 && (
        <aside
          className="resumen-servicios"
          aria-label="Servicios seleccionados"
        >
          <div>
            <small>Tu selección</small>
            {serviciosSeleccionados.map((servicio) => (
              <span key={servicio.id}>
                {servicio.nombre}
                <b>{pesos(servicio.precio)}</b>
              </span>
            ))}
            <strong>
              Total <b>{pesos(totalSeleccionado)}</b>
            </strong>
          </div>
          {!mostrarReserva ? (
            <button
              type="button"
              className="publico-boton"
              onClick={() => setMostrarReserva(true)}
            >
              Continuar con fecha y horario
            </button>
          ) : sedePrincipal ? (
            <ReservaIntegrada
              slug={datos.slug}
              nombreNegocio={datos.configuracion.titulo}
              politicaContacto={datos.politicaContacto}
              servicios={serviciosSeleccionados}
              profesionales={datos.profesionales}
              sede={sedePrincipal}
            />
          ) : null}
        </aside>
      )}
    </div>
  );
}

function ReservaIntegrada({
  slug,
  nombreNegocio,
  politicaContacto,
  servicios,
  profesionales,
  sede,
}: {
  slug: string;
  nombreNegocio: string;
  politicaContacto: DatosSitioPublico["politicaContacto"];
  servicios: DatosSitioPublico["servicios"];
  profesionales: DatosSitioPublico["profesionales"];
  sede: DatosSitioPublico["sedes"][number];
}) {
  const [profesionalId, setProfesionalId] = useState("");
  const [fecha, setFecha] = useState(minimoFecha());
  const [inicio, setInicio] = useState("");
  const [horarios, setHorarios] = useState<
    Array<{ inicio: string; etiqueta: string }>
  >([]);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState<"profesional" | "horario" | "datos">(
    "profesional",
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [codigo, setCodigo] = useState("");
  const profesionalesDisponibles = profesionales.filter(
    (profesional) =>
      profesional.sedeIds.includes(sede.id) &&
      servicios.every((servicio) =>
        profesional.servicioIds.includes(servicio.id),
      ),
  );

  useEffect(() => {
    if (!profesionalId || !fecha) {
      setHorarios([]);
      setInicio("");
      return;
    }
    const controlador = new AbortController();
    const parametros = new URLSearchParams({
      slug,
      servicioIds: servicios.map((servicio) => servicio.id).join(","),
      sedeId: sede.id,
      profesionalId,
      fecha,
    });
    setCargando(true);
    setInicio("");
    fetch(`/api/reservas-publicas/disponibilidad?${parametros}`, {
      signal: controlador.signal,
    })
      .then((respuesta) => respuesta.json())
      .then(
        (contenido: {
          horarios?: Array<{ inicio: string; etiqueta: string }>;
        }) => {
          setHorarios(contenido.horarios ?? []);
        },
      )
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setHorarios([]);
      })
      .finally(() => setCargando(false));
    return () => controlador.abort();
  }, [fecha, profesionalId, servicios, sede.id, slug]);

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!inicio || !profesionalId) return;
    setGuardando(true);
    setMensaje("");
    const formulario = new FormData(evento.currentTarget);
    const respuesta = await fetch("/api/reservas-publicas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        servicioIds: servicios.map((servicio) => servicio.id),
        profesionalId,
        sedeId: sede.id,
        inicio: new Date(inicio).toISOString(),
        nombre: formulario.get("nombre"),
        apellido: formulario.get("apellido"),
        email: formulario.get("email"),
        telefono: formulario.get("telefono"),
        aceptaWhatsapp: formulario.get("aceptaWhatsapp") === "on",
      }),
    });
    const resultado = (await respuesta.json()) as {
      codigo?: string;
      mensaje?: string;
    };
    if (respuesta.ok && resultado.codigo) setCodigo(resultado.codigo);
    else setMensaje(resultado.mensaje ?? "No pudimos confirmar el turno.");
    setGuardando(false);
  }

  if (codigo) {
    return (
      <div className="reserva-integrada__exito">
        <strong>Turno confirmado</strong>
        <span>
          {nombreNegocio} · Código {codigo}
        </span>
      </div>
    );
  }

  return (
    <div className="reserva-integrada">
      <div className="reserva-integrada__pasos">
        <span className={paso === "profesional" ? "activo" : ""}>
          1 Profesional
        </span>
        <span className={paso === "horario" ? "activo" : ""}>
          2 Fecha y hora
        </span>
        <span className={paso === "datos" ? "activo" : ""}>3 Confirmación</span>
      </div>
      {paso === "profesional" && (
        <div className="reserva-integrada__bloque">
          <strong>Elegí primero tu profesional</strong>
          <div className="reserva-integrada__opciones">
            {profesionalesDisponibles.map((profesional) => (
              <button
                type="button"
                key={profesional.id}
                className={profesionalId === profesional.id ? "activo" : ""}
                onClick={() => {
                  setProfesionalId(profesional.id);
                  setPaso("horario");
                }}
              >
                {profesional.foto ? (
                  <img src={profesional.foto} alt="" />
                ) : (
                  <i>{iniciales(profesional.nombre, profesional.apellido)}</i>
                )}
                <span>{profesional.nombre}</span>
              </button>
            ))}
          </div>
          {!profesionalesDisponibles.length && (
            <small>
              No hay un profesional disponible para estos servicios.
            </small>
          )}
        </div>
      )}
      {paso === "horario" && (
        <div className="reserva-integrada__bloque">
          <label>
            Fecha
            <input
              type="date"
              min={minimoFecha()}
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </label>
          <strong>Horarios disponibles</strong>
          {cargando ? (
            <small>Buscando horarios...</small>
          ) : horarios.length ? (
            <div className="reserva-integrada__horarios">
              {horarios.map((horario) => (
                <button
                  type="button"
                  key={horario.inicio}
                  className={inicio === horario.inicio ? "activo" : ""}
                  onClick={() => {
                    setInicio(horario.inicio);
                    setPaso("datos");
                  }}
                >
                  {horario.etiqueta}
                </button>
              ))}
            </div>
          ) : (
            <small>No hay horarios libres para esta fecha.</small>
          )}
          <button
            type="button"
            className="reserva-integrada__volver"
            onClick={() => setPaso("profesional")}
          >
            Cambiar profesional
          </button>
        </div>
      )}
      {paso === "datos" && (
        <form className="reserva-integrada__bloque" onSubmit={confirmar}>
          <strong>Confirmá tus datos</strong>
          <label>
            Nombre
            <input name="nombre" required />
          </label>
          <label>
            Apellido
            <input name="apellido" />
          </label>
          {(politicaContacto === "EMAIL" ||
            politicaContacto === "CUALQUIERA") && (
            <label>
              Correo
              <input
                name="email"
                type="email"
                required={politicaContacto === "EMAIL"}
              />
            </label>
          )}
          {(politicaContacto === "TELEFONO" ||
            politicaContacto === "CUALQUIERA") && (
            <label>
              Teléfono
              <input
                name="telefono"
                type="tel"
                required={politicaContacto === "TELEFONO"}
              />
            </label>
          )}
          <label className="reserva-integrada__check">
            <input name="aceptaWhatsapp" type="checkbox" /> Acepto recibir
            avisos por WhatsApp.
          </label>
          {mensaje && <small role="alert">{mensaje}</small>}
          <button className="publico-boton" disabled={guardando}>
            {guardando ? "Confirmando..." : "Confirmar turno"}
          </button>
          <button
            type="button"
            className="reserva-integrada__volver"
            onClick={() => setPaso("horario")}
          >
            Cambiar horario
          </button>
        </form>
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

function nombreDia(diaSemana: number) {
  return (
    ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][
      diaSemana
    ] ?? "Día"
  );
}

function posicionDestacado(id: string, destacados: string[]) {
  const posicion = destacados.indexOf(id);
  return posicion === -1 ? Number.MAX_SAFE_INTEGER : posicion;
}

function minimoFecha() {
  const fecha = new Date(Date.now() + 30 * 60_000);
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
