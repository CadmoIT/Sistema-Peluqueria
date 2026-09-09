/** Implementa el onboarding autoguiado con vista previa y guardado local. */
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  MapPin,
  Plus,
  Save,
} from "lucide-react";
import { NavegacionPanel } from "./navegacion-panel";
import {
  CLAVE_REGISTRO_NEGOCIO,
  obtenerNombreRubro,
  type RegistroNegocioInicial,
} from "@/lib/registro-inicial";

type Configuracion = {
  nombre: string;
  rubro: string;
  slug: string;
  telefono: string;
  sede: string;
  direccion: string;
  servicio: string;
  precio: string;
  profesional: string;
  color: string;
  estilo: string;
};

const inicial: Configuracion = {
  nombre: "",
  rubro: "",
  slug: "",
  telefono: "",
  sede: "",
  direccion: "",
  servicio: "",
  precio: "",
  profesional: "",
  color: "#126783",
  estilo: "Editorial",
};
const pasos = [
  "Tu negocio",
  "Sede y horarios",
  "Servicios y equipo",
  "Diseño",
  "Publicación",
];

export function AsistenteConfiguracion() {
  const [paso, setPaso] = useState(0);
  const [configuracion, setConfiguracion] = useState(inicial);
  const [guardado, setGuardado] = useState(true);

  useEffect(() => {
    const existente = window.localStorage.getItem(
      "turnosrapidos-configuracion",
    );
    if (existente) {
      setConfiguracion({ ...inicial, ...JSON.parse(existente) });
      return;
    }

    const registro = window.sessionStorage.getItem(CLAVE_REGISTRO_NEGOCIO);
    if (!registro) return;

    try {
      const datos = JSON.parse(registro) as RegistroNegocioInicial;
      setConfiguracion((actual) => ({
        ...actual,
        rubro: obtenerNombreRubro(datos.tipoNegocio),
      }));
    } catch {
      window.sessionStorage.removeItem(CLAVE_REGISTRO_NEGOCIO);
    }
  }, []);

  useEffect(() => {
    setGuardado(false);
    const temporizador = window.setTimeout(() => {
      window.localStorage.setItem(
        "turnosrapidos-configuracion",
        JSON.stringify(configuracion),
      );
      setGuardado(true);
    }, 350);
    return () => window.clearTimeout(temporizador);
  }, [configuracion]);

  const porcentaje = useMemo(
    () => Math.round(((paso + 1) / pasos.length) * 100),
    [paso],
  );
  const actualizar = (campo: keyof Configuracion, valor: string) =>
    setConfiguracion((actual) => ({ ...actual, [campo]: valor }));

  return (
    <div className="panel-shell configurador-shell">
      <NavegacionPanel />
      <main className="configurador">
        <header className="configurador__cabecera">
          <div>
            <Link href="/panel">
              <ArrowLeft /> Volver al panel
            </Link>
            <h1>Configurá tu página</h1>
          </div>
          <span className={guardado ? "guardado" : "guardando"}>
            <Save /> {guardado ? "Todo guardado" : "Guardando..."}
          </span>
        </header>
        <div className="configurador__progreso">
          <div>
            <i style={{ width: `${porcentaje}%` }} />
          </div>
          <span>{porcentaje}% completo</span>
        </div>

        <div className="configurador__grilla">
          <nav
            className="pasos-configuracion"
            aria-label="Pasos de configuración"
          >
            {pasos.map((nombre, indice) => (
              <button
                key={nombre}
                className={
                  indice === paso ? "activo" : indice < paso ? "completo" : ""
                }
                onClick={() => setPaso(indice)}
              >
                <i>{indice < paso ? <Check /> : indice + 1}</i>
                <span>{nombre}</span>
              </button>
            ))}
          </nav>

          <section className="formulario-configuracion">
            <small>
              PASO {paso + 1} DE {pasos.length}
            </small>
            {paso === 0 && (
              <PasoNegocio datos={configuracion} actualizar={actualizar} />
            )}
            {paso === 1 && (
              <PasoSede datos={configuracion} actualizar={actualizar} />
            )}
            {paso === 2 && (
              <PasoServicios datos={configuracion} actualizar={actualizar} />
            )}
            {paso === 3 && (
              <PasoDiseno datos={configuracion} actualizar={actualizar} />
            )}
            {paso === 4 && <PasoPublicacion datos={configuracion} />}

            <footer className="acciones-configuracion">
              <button
                className="boton boton--fantasma"
                disabled={paso === 0}
                onClick={() => setPaso((actual) => actual - 1)}
              >
                Anterior
              </button>
              {paso < pasos.length - 1 ? (
                <button
                  className="boton boton--primario"
                  onClick={() => setPaso((actual) => actual + 1)}
                >
                  Guardar y continuar <ArrowRight />
                </button>
              ) : (
                <Link className="boton boton--primario" href="/precios">
                  Elegir un plan <ArrowRight />
                </Link>
              )}
            </footer>
          </section>

          <aside className="preview-configuracion">
            <div className="preview-configuracion__barra">
              <i />
              <i />
              <i />
              <span>Vista previa</span>
            </div>
            <div
              className="preview-configuracion__sitio"
              style={
                { "--color-negocio": configuracion.color } as CSSProperties
              }
            >
              <header>
                <strong>{configuracion.nombre || "Tu negocio"}</strong>
                <button>Reservar</button>
              </header>
              <div className="preview-portada">
                <span>{configuracion.rubro}</span>
                <h2>
                  Tu estilo.
                  <br />
                  <em>Tu momento.</em>
                </h2>
              </div>
              <div className="preview-servicio">
                <small>SERVICIO DESTACADO</small>
                <strong>{configuracion.servicio || "Tu servicio"}</strong>
                <span>
                  {configuracion.precio
                    ? `$ ${Number(configuracion.precio).toLocaleString("es-AR")}`
                    : "$ 0"}
                </span>
              </div>
              <div className="preview-ubicacion">
                <MapPin />
                <span>
                  <strong>{configuracion.sede}</strong>
                  {configuracion.direccion}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

type PasoProps = {
  datos: Configuracion;
  actualizar: (campo: keyof Configuracion, valor: string) => void;
};

function PasoNegocio({ datos, actualizar }: PasoProps) {
  const generarSlug = (nombre: string) =>
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <>
      <h2>Empecemos por tu negocio</h2>
      <p>Estos datos serán la presentación de tu página.</p>
      <Campo
        etiqueta="Nombre del negocio"
        valor={datos.nombre}
        alCambiar={(nombre) => {
          actualizar("nombre", nombre);
          actualizar("slug", generarSlug(nombre));
        }}
      />
      <Campo
        etiqueta="Subdominio generado"
        valor={datos.slug}
        prefijo="https://"
        sufijo=".site.turnosrapidos.com.ar"
        alCambiar={(v) =>
          actualizar("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
        }
      />
      <Campo
        etiqueta="WhatsApp o teléfono"
        valor={datos.telefono}
        alCambiar={(v) => actualizar("telefono", v)}
      />
    </>
  );
}

function PasoSede({ datos, actualizar }: PasoProps) {
  return (
    <>
      <h2>¿Dónde atendés?</h2>
      <p>Podrás agregar todas las sedes que necesites más adelante.</p>
      <Campo
        etiqueta="Nombre de la sede"
        valor={datos.sede}
        alCambiar={(v) => actualizar("sede", v)}
      />
      <Campo
        etiqueta="Dirección"
        valor={datos.direccion}
        alCambiar={(v) => actualizar("direccion", v)}
      />
      <div className="horario-simple">
        <span>Lunes a viernes</span>
        <input aria-label="Apertura" type="time" defaultValue="09:00" />
        <span>a</span>
        <input aria-label="Cierre" type="time" defaultValue="20:00" />
      </div>
      <button className="agregar-linea">
        <Plus /> Agregar otro horario
      </button>
    </>
  );
}

function PasoServicios({ datos, actualizar }: PasoProps) {
  return (
    <>
      <h2>Cargá tu primer servicio</h2>
      <p>Después podrás sumar categorías, combos y productos.</p>
      <Campo
        etiqueta="Servicio"
        valor={datos.servicio}
        alCambiar={(v) => actualizar("servicio", v)}
      />
      <div className="campos-dobles">
        <Campo
          etiqueta="Precio"
          valor={datos.precio}
          tipo="number"
          prefijo="$"
          alCambiar={(v) => actualizar("precio", v)}
        />
        <Campo
          etiqueta="Profesional"
          valor={datos.profesional}
          alCambiar={(v) => actualizar("profesional", v)}
        />
      </div>
      <button className="agregar-linea">
        <Plus /> Agregar otro servicio
      </button>
    </>
  );
}

function PasoDiseno({ datos, actualizar }: PasoProps) {
  return (
    <>
      <h2>Dale tu estilo</h2>
      <p>La vista previa cambia mientras elegís.</p>
      <label className="selector-color">
        Color principal
        <input
          type="color"
          value={datos.color}
          onChange={(e) => actualizar("color", e.target.value)}
        />
        <span>{datos.color}</span>
      </label>
      <div className="plantillas">
        {["Editorial", "Minimalista", "Clásica"].map((estilo) => (
          <button
            key={estilo}
            className={datos.estilo === estilo ? "activo" : ""}
            onClick={() => actualizar("estilo", estilo)}
          >
            <i />
            <strong>{estilo}</strong>
          </button>
        ))}
      </div>
    </>
  );
}

function PasoPublicacion({ datos }: { datos: Configuracion }) {
  return (
    <>
      <h2>Tu página está lista para probar</h2>
      <p>
        Podés seguir ajustándola gratis. Para compartirla públicamente deberás
        elegir un plan.
      </p>
      <div className="enlaces-publicacion">
        <div>
          <small>AHORA, EN PRUEBA</small>
          <strong>localhost:3000/sitio/{datos.slug}</strong>
        </div>
        <div>
          <small>SIN DOMINIO PROPIO</small>
          <strong>{datos.slug}.site.turnosrapidos.com.ar</strong>
        </div>
        <div className="pendiente">
          <small>CON DOMINIO PROPIO · ETAPA FINAL</small>
          <strong>turnos.{datos.slug}.com.ar</strong>
        </div>
      </div>
      <div className="planes-onboarding">
        <article>
          <span>Autogestionado</span>
          <strong>
            $9.900<small>/mes</small>
          </strong>
          <p>Subdominio y conexión de un dominio existente.</p>
        </article>
        <article className="destacado">
          <span>Dominio gestionado</span>
          <strong>
            $12.900<small>/mes</small>
          </strong>
          <p>Incluye alta, renovación .com.ar, DNS y SSL.</p>
        </article>
      </div>
      <Link
        className="boton boton--secundario ver-preview"
        href="/sitio/manly-barber"
      >
        <ExternalLink /> Abrir vista previa
      </Link>
    </>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
  tipo = "text",
  prefijo,
  sufijo,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  tipo?: string;
  prefijo?: string;
  sufijo?: string;
}) {
  return (
    <label className="campo-configuracion">
      {etiqueta}
      <div>
        {prefijo && <span>{prefijo}</span>}
        <input
          type={tipo}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
        />
        {sufijo && <span>{sufijo}</span>}
      </div>
    </label>
  );
}
