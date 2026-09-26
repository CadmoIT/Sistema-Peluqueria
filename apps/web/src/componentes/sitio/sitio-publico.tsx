/** Renderiza el micrositio publicado con portada, catálogo, equipo, sedes y reserva. */
/* eslint-disable @next/next/no-img-element -- El origen de las imágenes pertenece a cada negocio y luego será R2. */
"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Search,
  Star,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { enlaceInstagram } from "@/lib/enlaces-redes";
import { GrupoProfesionales } from "@/componentes/sitio/grupo-profesionales";

export type DatosSitioPublico = {
  slug: string;
  nombre: string;
  descripcion: string;
  politicaContacto: "EMAIL" | "TELEFONO" | "CUALQUIERA" | "NINGUNO";
  configuracion: {
    titulo: string;
    descripcion: string;
    colorTitulo: string;
    colorSubtitulo: string;
    colorPrincipal: string;
    colorFondo: string;
    colorTexto: string;
    logoUrl: string;
    whatsapp: string;
    instagram: string;
    googleMapsUrl: string;
    hero: Array<{ url: string; alt: string; focoX: number; focoY: number }>;
    secciones: Array<"servicios" | "equipo" | "contacto" | "ubicacion">;
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

export function SitioPublico({
  datos,
  modoVistaPrevia = false,
}: {
  datos: DatosSitioPublico;
  modoVistaPrevia?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [serviciosElegidos, setServiciosElegidos] = useState<string[]>([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);
  const imagenPortada = datos.configuracion.hero.find((imagen) => imagen.url);
  const instagram = enlaceInstagram(datos.configuracion.instagram);
  const servicios = useMemo(
    () =>
      datos.servicios
        .filter((servicio) =>
          `${servicio.nombre} ${servicio.categoria}`
            .toLocaleLowerCase("es")
            .includes(busqueda.toLocaleLowerCase("es")),
        ),
    [busqueda, datos.servicios],
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
  const mostrarUbicacion = datos.configuracion.secciones.includes("ubicacion");
  const mostrarContacto = datos.configuracion.secciones.includes("contacto");
  const mostrarEquipo = datos.configuracion.secciones.includes("equipo");
  const estilo = {
    "--sitio-titulo": datos.configuracion.colorTitulo,
    "--sitio-subtitulo": datos.configuracion.colorSubtitulo,
    "--sitio-acento": datos.configuracion.colorPrincipal,
    "--sitio-principal": datos.configuracion.colorPrincipal,
    "--sitio-fondo": datos.configuracion.colorFondo,
    "--sitio-texto": datos.configuracion.colorTexto,
  } as React.CSSProperties;
  const sedePrincipal = datos.sedes[0];
  const telefono =
    datos.configuracion.whatsapp.trim() || sedePrincipal?.telefono || "";

  return (
    <div
      className={`publico-sitio${modoVistaPrevia ? " editor-preview__sitio" : ""}`}
      style={estilo}
    >
      <main>
        {sedePrincipal && (
          <section
            className="publico-identidad"
            aria-label="Información del local"
          >
            <div className="publico-identidad__principal">
              <section
                className={`publico-hero ${imagenPortada ? "con-imagen" : ""}`}
                aria-label={imagenPortada?.alt || undefined}
                style={
                  imagenPortada
                    ? {
                        backgroundImage: `url(${imagenPortada.url})`,
                        backgroundPosition: `${imagenPortada.focoX}% ${imagenPortada.focoY}%`,
                      }
                    : undefined
                }
              >
                <div className="publico-hero__velo" />
              </section>
              <div className="publico-identidad__marca">
                <div className="publico-identidad__encabezado">
                  {datos.configuracion.logoUrl && (
                    <img
                      className="publico-identidad__logo"
                      src={datos.configuracion.logoUrl}
                      alt=""
                    />
                  )}
                  <div>
                    <h2>{datos.configuracion.titulo}</h2>
                    <p>{datos.configuracion.descripcion || datos.descripcion}</p>
                  </div>
                </div>
              </div>
            </div>
            {(mostrarUbicacion || mostrarContacto || mostrarEquipo) && (
              <aside className="publico-identidad__tarjeta" aria-label={`Información de ${sedePrincipal.nombre}`}>
                {mostrarUbicacion && (
                  <div className="publico-identidad__mapa">
                    <iframe
                      title={`Mapa de ${sedePrincipal.nombre}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(sedePrincipal.direccion || datos.nombre)}&output=embed`}
                    />
                  </div>
                )}
                {(mostrarUbicacion || mostrarContacto) && (
                  <div className="publico-identidad__datos">
                    {mostrarUbicacion && (
                      <a
                        className="publico-identidad__direccion"
                        href={
                          datos.configuracion.googleMapsUrl ||
                          sedePrincipal.googleMapsUrl ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sedePrincipal.direccion || datos.nombre)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img className="publico-identidad__icono-maps" src="/iconos/google-maps.png" alt="" /> {sedePrincipal.direccion || "Dirección pendiente"}
                      </a>
                    )}
                    {mostrarContacto && telefono && (
                      <a
                        href={`https://wa.me/${telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaWhatsapp /> {telefono}
                      </a>
                    )}
                    {mostrarContacto && instagram && (
                      <a
                        className="publico-identidad__instagram"
                        href={instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram del negocio"
                      >
                        <img src="/iconos/instagram.png" alt="" /> Instagram
                      </a>
                    )}
                    {mostrarUbicacion && (
                      <>
                        <div className="publico-horarios" tabIndex={0} aria-label="Ver horarios de atención">
                          <span><Clock3 /> Ver horario</span>
                          <div role="tooltip">
                            <strong>Horarios de atención</strong>
                            {sedePrincipal.horarios
                              .filter((horario) => horario.activo)
                              .map((horario) => (
                                <span key={horario.diaSemana}>
                                  {nombreDia(horario.diaSemana)} · {horario.abre} a {horario.cierra}
                                </span>
                              ))}
                          </div>
                        </div>
                        {sedePrincipal.googlePuntaje !== null && (
                          <span className="publico-identidad__valoracion" aria-label={`Puntuación ${sedePrincipal.googlePuntaje} de 5`}>
                            <span aria-hidden="true">
                            {Array.from({ length: 5 }, (_, indice) => (
                                <Star key={indice} fill="currentColor" />
                              ))}
                            </span>
                            {sedePrincipal.googlePuntaje} · {sedePrincipal.googleResenas ?? 0} valoraciones
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
                {mostrarEquipo && datos.profesionales.length > 0 && (
                <div className="publico-identidad__equipo">
                  <h3>Profesionales</h3>
                  <GrupoProfesionales profesionales={datos.profesionales} />
                </div>
                )}
              </aside>
            )}
          </section>
        )}
        {datos.configuracion.secciones.includes("servicios") && (
          <section className="publico-experiencia" id="servicios">
            <div className="publico-catalogo-col">
              <div className="publico-titulo">
                <h2>Elegí tu próximo turno</h2>
              </div>
              <label className="publico-buscador">
                <Search />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar un servicio (ej. corte, uñas,masaje...)"
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
                    >
                      <summary
                        onClick={(evento) => {
                          evento.preventDefault();
                          setCategoriaAbierta((actual) =>
                            actual === categoria ? null : categoria,
                          );
                        }}
                      >
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
                                onClick={() => {
                                  if (modoVistaPrevia) return;
                                  setServiciosElegidos((actuales) =>
                                    actuales.includes(servicio.id)
                                      ? actuales.filter(
                                          (id) => id !== servicio.id,
                                        )
                                      : [...actuales, servicio.id],
                                  );
                                }}
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

function minimoFecha() {
  const fecha = new Date(Date.now() + 30 * 60_000);
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
