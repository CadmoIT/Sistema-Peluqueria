/** Guía al cliente por servicio, horario y datos personales hasta confirmar la reserva. */
"use client";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, MapPin, ShieldCheck } from "lucide-react";
type Opcion = { id: string; nombre: string };
type Servicio = Opcion & {
  duracionMinutos: number;
  precio: number;
  sedeIds: string[];
  profesionalIds: string[];
};
type Profesional = Opcion & { sedeIds: string[]; servicioIds: string[] };

export function FlujoReserva({
  slug,
  nombreNegocio,
  politicaContacto,
  servicioInicial,
  servicios,
  profesionales,
  sedes,
}: {
  slug: string;
  nombreNegocio: string;
  politicaContacto: "EMAIL" | "TELEFONO" | "CUALQUIERA" | "NINGUNO";
  servicioInicial?: string;
  servicios: Servicio[];
  profesionales: Profesional[];
  sedes: Array<Opcion & { direccion: string }>;
}) {
  const [servicioId, setServicioId] = useState(
    servicios.some((s) => s.id === servicioInicial)
      ? servicioInicial!
      : servicios[0]!.id,
  );
  const [profesionalId, setProfesionalId] = useState(profesionales[0]!.id);
  const [sedeId, setSedeId] = useState(sedes[0]!.id);
  const [fecha, setFecha] = useState(minimoFecha());
  const [inicio, setInicio] = useState("");
  const [horarios, setHorarios] = useState<
    Array<{ inicio: string; etiqueta: string }>
  >([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [paso, setPaso] = useState(1);
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const servicio = useMemo(
    () => servicios.find((item) => item.id === servicioId)!,
    [servicioId, servicios],
  );
  const sedesDisponibles = useMemo(
    () => sedes.filter((item) => servicio.sedeIds.includes(item.id)),
    [sedes, servicio.sedeIds],
  );
  const profesionalesDisponibles = useMemo(
    () =>
      profesionales.filter(
        (item) =>
          item.sedeIds.includes(sedeId) &&
          item.servicioIds.includes(servicioId) &&
          servicio.profesionalIds.includes(item.id),
      ),
    [profesionales, sedeId, servicio.profesionalIds, servicioId],
  );
  const sede = sedes.find((item) => item.id === sedeId) ?? sedesDisponibles[0];

  useEffect(() => {
    if (!sedesDisponibles.some((item) => item.id === sedeId)) {
      setSedeId(sedesDisponibles[0]?.id ?? "");
    }
  }, [sedeId, sedesDisponibles]);

  useEffect(() => {
    if (!profesionalesDisponibles.some((item) => item.id === profesionalId)) {
      setProfesionalId(profesionalesDisponibles[0]?.id ?? "");
    }
  }, [profesionalId, profesionalesDisponibles]);

  useEffect(() => {
    if (!servicioId || !sedeId || !profesionalId || !fecha) {
      setHorarios([]);
      setInicio("");
      return;
    }

    const controlador = new AbortController();
    const parametros = new URLSearchParams({
      slug,
      servicioId,
      sedeId,
      profesionalId,
      fecha,
    });
    setCargandoHorarios(true);
    setInicio("");
    fetch(`/api/reservas-publicas/disponibilidad?${parametros}`, {
      signal: controlador.signal,
    })
      .then((respuesta) => respuesta.json())
      .then(
        (contenido: {
          horarios?: Array<{ inicio: string; etiqueta: string }>;
        }) => setHorarios(contenido.horarios ?? []),
      )
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setHorarios([]);
      })
      .finally(() => setCargandoHorarios(false));

    return () => controlador.abort();
  }, [fecha, profesionalId, sedeId, servicioId, slug]);
  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setGuardando(true);
    const formulario = new FormData(evento.currentTarget);
    const respuesta = await fetch("/api/reservas-publicas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        servicioId,
        profesionalId,
        sedeId,
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
  if (codigo)
    return (
      <main className="reserva-exito">
        <span>
          <Check />
        </span>
        <small>RESERVA CONFIRMADA</small>
        <h1>Nos vemos pronto.</h1>
        <p>Guardá este código para identificar tu turno.</p>
        <div>
          <strong>{codigo}</strong>
          <small>
            {formatoFecha(inicio)} · {servicio.nombre}
          </small>
          <small>
            {nombreNegocio} · {sede?.nombre}
          </small>
        </div>
        <Link className="boton boton--primario" href={`/sitio/${slug}`}>
          Volver al sitio
        </Link>
      </main>
    );
  return (
    <main className="flujo-reserva">
      <aside>
        <Link href={`/sitio/${slug}`}>
          <ArrowLeft /> Volver
        </Link>
        <div className="logo-reserva">{nombreNegocio}</div>
        <div className="resumen-reserva">
          <small>TU RESERVA</small>
          <h2>{servicio.nombre}</h2>
          <p>
            <Clock3 /> {servicio.duracionMinutos} minutos
          </p>
          <p>
            <MapPin /> {sede?.nombre ?? "Elegí una sede"}
          </p>
          <hr />
          <div>
            <span>Total</span>
            <b>{pesos(servicio.precio)}</b>
          </div>
          <small className="nota-sena">
            El negocio te informará si corresponde una seña.
          </small>
        </div>
        <p className="seguro">
          <ShieldCheck /> Reserva protegida por TurnosRápidos
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
            <h1>Elegí tu turno</h1>
            <p>Seleccioná servicio, sede, profesional y horario.</p>
            <div className="datos-cliente">
              <label>
                Servicio
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                >
                  {servicios.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} · {pesos(item.precio)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sede
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                >
                  {sedesDisponibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Profesional
                <select
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                >
                  {profesionalesDisponibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  min={minimoFecha()}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </label>
              <div className="selector-horarios">
                <span>Horarios disponibles</span>
                {cargandoHorarios ? (
                  <p>Buscando horarios...</p>
                ) : horarios.length ? (
                  <div>
                    {horarios.map((horario) => (
                      <button
                        type="button"
                        className={inicio === horario.inicio ? "activo" : ""}
                        key={horario.inicio}
                        onClick={() => setInicio(horario.inicio)}
                      >
                        {horario.etiqueta}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>No hay horarios libres para esta fecha.</p>
                )}
              </div>
              <button
                disabled={!inicio || !sedeId || !profesionalId}
                className="boton boton--primario continuar"
                onClick={() => setPaso(2)}
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <small>PASO 2 DE 3</small>
            <h1>¿Cómo te identificamos?</h1>
            <p>
              El negocio usa estos datos únicamente para gestionar tu turno.
            </p>
            <form className="datos-cliente" onSubmit={confirmar}>
              <div className="form-grid">
                <label>
                  Nombre
                  <input name="nombre" autoComplete="given-name" />
                </label>
                <label>
                  Apellido
                  <input name="apellido" autoComplete="family-name" />
                </label>
              </div>
              <label>
                Correo
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required={politicaContacto === "EMAIL"}
                />
              </label>
              <label>
                Teléfono
                <input
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  required={politicaContacto === "TELEFONO"}
                />
              </label>
              {politicaContacto === "CUALQUIERA" && (
                <small>Ingresá al menos correo o teléfono.</small>
              )}
              <label className="consentimiento-whatsapp">
                <input name="aceptaWhatsapp" type="checkbox" />
                Acepto recibir confirmaciones y recordatorios de este negocio por WhatsApp. Es opcional y puedo pedir que dejen de enviármelos.
              </label>
              {mensaje && (
                <p className="error-reserva" role="alert">
                  {mensaje}
                </p>
              )}
              <button
                className="boton boton--primario continuar"
                disabled={guardando}
              >
                {guardando ? "Confirmando..." : "Confirmar reserva"}
              </button>
              <button
                className="volver-paso"
                type="button"
                onClick={() => setPaso(1)}
              >
                Volver
              </button>
            </form>
          </>
        )}
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
function formatoFecha(valor: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(valor));
}
function minimoFecha() {
  const fecha = new Date(Date.now() + 30 * 60_000);
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
