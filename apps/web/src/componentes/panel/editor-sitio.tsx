/** Permite editar el micrositio con controles visuales y lenguaje cotidiano. */
/* eslint-disable @next/next/no-img-element -- La vista previa acepta imágenes propias y URLs temporales. */
"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  MapPin,
  MessageCircle,
  Palette,
} from "lucide-react";
import { CampoImagen } from "@/componentes/panel/campo-imagen";
import { VistaPreviaSitio } from "@/componentes/panel/vista-previa-sitio";

export type BorradorSitio = {
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
  versionSecciones: number;
};

type LocalSitio = {
  id: string;
  nombre: string;
  subdominio?: string | null;
  direccion: string;
  telefono: string | null;
  googleMapsUrl: string | null;
  googlePuntaje: number | null;
  googleResenas: number | null;
};

const nombresSecciones = {
  servicios: "Servicios",
  equipo: "Profesionales",
  contacto: "Contacto",
  ubicacion: "Ubicación",
};
const coloresFrecuentes = [
  "#111111",
  "#ffffff",
  "#126783",
  "#2a9fba",
  "#1f7a5c",
  "#b65f3a",
  "#815b8f",
  "#ead8c4",
];

export function EditorSitio({
  inicial,
  localId,
  servicios,
  profesionales,
  locales,
}: {
  inicial: BorradorSitio;
  localId: string;
  servicios: Array<{
    id: string;
    nombre: string;
    precio: number;
    categoria: string;
    descripcion: string | null;
    duracionMinutos: number;
    imagen: string | null;
  }>;
  profesionales: Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    foto: string | null;
    especialidad: string | null;
  }>;
  locales: Array<
    LocalSitio & {
      horarios?: Array<{
        diaSemana: number;
        abre: string;
        cierra: string;
        activo: boolean;
      }>;
    }
  >;
}) {
  const [datos, setDatos] = useState(inicial);
  const idLocal = localId || locales[0]?.id || "";
  const cambiar = (
    campo: keyof BorradorSitio,
    valor: string | boolean | number,
  ) =>
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  const cambiarHero = (
    indice: number,
    campo: "url" | "alt" | "focoX" | "focoY",
    valor: string | number,
  ) =>
    setDatos((actual) => ({
      ...actual,
      hero: Array.from({ length: 1 }, (_, i) =>
        i === indice
          ? {
              ...(actual.hero[i] ?? {
                url: "",
                alt: "",
                focoX: 50,
                focoY: 50,
              }),
              [campo]: valor,
            }
          : (actual.hero[i] ?? {
              url: "",
              alt: "",
              focoX: 50,
              focoY: 50,
            }),
      ),
    }));

  function alternarSeccion(seccion: BorradorSitio["secciones"][number]) {
    setDatos((actual) => ({
      ...actual,
      secciones: actual.secciones.includes(seccion)
        ? actual.secciones.filter((item) => item !== seccion)
        : [...actual.secciones, seccion],
    }));
  }

  return (
    <div className="editor-sitio editor-sitio--simple">
      <form
        id="form-editor-sitio"
        className="editor-controles"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <input
          type="text"
          name="localId"
          value={idLocal}
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: "none" }}
        />
        <input type="hidden" name="versionSecciones" value="2" />
        <details className="grupo-editor" open>
          <summary>Identidad</summary>
          <div>
            <label>
              Nombre visible
              <input
                name="titulo"
                value={datos.titulo}
                onChange={(evento) => cambiar("titulo", evento.target.value)}
              />
            </label>
            <label>
              Presentación breve
              <textarea
                name="descripcion"
                rows={4}
                value={datos.descripcion}
                onChange={(evento) =>
                  cambiar("descripcion", evento.target.value)
                }
              />
            </label>
            <CampoImagen
              name="logoUrl"
              etiqueta="Logo"
              tipo="logo"
              valor={datos.logoUrl}
              alCambiar={(valor) => cambiar("logoUrl", valor)}
            />
          </div>
        </details>

        <details className="grupo-editor" open>
          <summary>
            <Palette /> Colores
          </summary>
          <div className="colores-circulares">
            <SelectorColor
              nombre="colorTitulo"
              etiqueta="Título"
              valor={datos.colorTitulo}
              alCambiar={(valor) => cambiar("colorTitulo", valor)}
            />
            <SelectorColor
              nombre="colorSubtitulo"
              etiqueta="Subtítulo"
              valor={datos.colorSubtitulo}
              alCambiar={(valor) => cambiar("colorSubtitulo", valor)}
            />
            <SelectorColor
              nombre="colorPrincipal"
              etiqueta="Botones"
              valor={datos.colorPrincipal}
              alCambiar={(valor) => cambiar("colorPrincipal", valor)}
            />
            <SelectorColor
              nombre="colorFondo"
              etiqueta="Fondo"
              valor={datos.colorFondo}
              alCambiar={(valor) => cambiar("colorFondo", valor)}
            />
            <SelectorColor
              nombre="colorTexto"
              etiqueta="Texto"
              valor={datos.colorTexto}
              alCambiar={(valor) => cambiar("colorTexto", valor)}
            />
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Portada</summary>
          <div>
            <CampoImagen
              name="hero1"
              etiqueta="Foto de portada"
              tipo="portada"
              valor={datos.hero[0]?.url ?? ""}
              alCambiar={(valor) => cambiarHero(0, "url", valor)}
              soloCarga
            />
            {datos.hero[0]?.url && (
              <SelectorFoco
                imagen={datos.hero[0].url}
                x={datos.hero[0].focoX}
                y={datos.hero[0].focoY}
                alCambiar={(x, y) => {
                  cambiarHero(0, "focoX", x);
                  cambiarHero(0, "focoY", y);
                }}
              />
            )}
            <input type="hidden" name="heroFocoX1" value={datos.hero[0]?.focoX ?? 50} />
            <input type="hidden" name="heroFocoY1" value={datos.hero[0]?.focoY ?? 50} />
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Contenido</summary>
          <div>
            <fieldset className="secciones-editor">
              <legend>Secciones del sitio</legend>
              {(Object.keys(nombresSecciones) as BorradorSitio["secciones"]).map((seccion) => {
                const visible = datos.secciones.includes(seccion);
                return (
                  <div key={seccion}>
                    <label>
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => alternarSeccion(seccion)}
                      />
                      {nombresSecciones[seccion]}
                    </label>
                    {visible && <input type="hidden" name="secciones" value={seccion} />}
                  </div>
                );
              })}
            </fieldset>
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Contacto</summary>
          <div>
            <div className="form-grid">
              <label>
                WhatsApp
                <input
                  name="whatsapp"
                  value={datos.whatsapp}
                  onChange={(evento) =>
                    cambiar("whatsapp", evento.target.value)
                  }
                />
              </label>
              {!datos.whatsapp.trim() && (
                <p className="aviso-ajustes">
                  Agregá un teléfono para mostrar el botón de contacto en tu
                  página. También podés cargarlo en Datos del local.
                </p>
              )}
              <label>
                Instagram
                <input
                  name="instagram"
                  value={datos.instagram}
                  onChange={(evento) =>
                    cambiar("instagram", evento.target.value)
                  }
                />
              </label>
            </div>
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Ubicación</summary>
          <div>
            <label>
              Enlace del local en Google Maps
              <input
                name="googleMapsUrl"
                type="url"
                value={datos.googleMapsUrl}
                onChange={(evento) => cambiar("googleMapsUrl", evento.target.value)}
                placeholder="Pegá el enlace para compartir del local"
              />
            </label>
            {!locales.length && (
              <a href="/panel/configuracion/locales">
                Completar datos del local
              </a>
            )}
          </div>
        </details>
      </form>

      <section className="editor-preview">
        <VistaPreviaSitio
          datos={datos}
          servicios={servicios}
          profesionales={profesionales}
          locales={locales}
          localId={idLocal}
        />
      </section>
    </div>
  );
}

function SelectorColor({
  nombre,
  etiqueta,
  valor,
  alCambiar,
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
}) {
  return (
    <details className="selector-color">
      <summary>
        <i style={{ background: valor }} />
        <span>{etiqueta}</span>
      </summary>
      <div>
        <strong>Colores frecuentes</strong>
        <div>
          {coloresFrecuentes.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={"Usar color " + color}
              className={valor === color ? "activo" : ""}
              style={{ background: color }}
              onClick={() => alCambiar(color)}
            />
          ))}
        </div>
        <label>
          Más colores
          <input
            name={nombre}
            type="color"
            value={valor}
            onChange={(evento) => alCambiar(evento.target.value)}
          />
        </label>
      </div>
    </details>
  );
}

function SelectorFoco({
  imagen,
  x,
  y,
  alCambiar,
}: {
  imagen: string;
  x: number;
  y: number;
  alCambiar: (x: number, y: number) => void;
}) {
  const arrastre = useRef<{
    id: number;
    x: number;
    y: number;
    focoX: number;
    focoY: number;
    ancho: number;
    alto: number;
  } | null>(null);

  function iniciar(evento: PointerEvent<HTMLButtonElement>) {
    const limites = evento.currentTarget.getBoundingClientRect();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastre.current = {
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      focoX: x,
      focoY: y,
      ancho: limites.width,
      alto: limites.height,
    };
  }

  function mover(evento: PointerEvent<HTMLButtonElement>) {
    const inicio = arrastre.current;
    if (!inicio || inicio.id !== evento.pointerId) return;
    alCambiar(
      Math.max(0, Math.min(100, Math.round(inicio.focoX - ((evento.clientX - inicio.x) / inicio.ancho) * 100))),
      Math.max(0, Math.min(100, Math.round(inicio.focoY - ((evento.clientY - inicio.y) / inicio.alto) * 100))),
    );
  }

  return (
    <div className="selector-foco">
      <span>Acomodá la foto arrastrándola</span>
      <button
        type="button"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={() => { arrastre.current = null; }}
        onPointerCancel={() => { arrastre.current = null; }}
        style={{ backgroundImage: "url(" + imagen + ")" }}
        aria-label="Arrastrá para acomodar la foto de portada"
      />
    </div>
  );
}

// La implementación anterior se conserva temporalmente para evitar cambios de formato en borradores existentes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VistaPrevia({
  datos,
  servicios,
  profesionales,
  locales,
}: {
  datos: BorradorSitio;
  servicios: Array<{
    id: string;
    nombre: string;
    precio: number;
    categoria: string;
  }>;
  profesionales: Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    foto: string | null;
    especialidad: string | null;
  }>;
  locales: LocalSitio[];
}) {
  const estilo = {
    "--sitio-titulo": datos.colorTitulo,
    "--sitio-subtitulo": datos.colorSubtitulo,
    "--sitio-acento": datos.colorPrincipal,
    "--sitio-principal": datos.colorPrincipal,
    "--sitio-fondo": datos.colorFondo,
    "--sitio-texto": datos.colorTexto,
  } as React.CSSProperties;
  const categorias = servicios.reduce<Record<string, typeof servicios>>(
    (grupos, servicio) => {
      (grupos[servicio.categoria] ??= []).push(servicio);
      return grupos;
    },
    {},
  );
  return (
    <div className="mini-sitio mini-sitio--nuevo" style={estilo}>
      <div
        className="mini-hero"
        style={
          datos.hero[0]?.url
            ? {
                backgroundImage: "url(" + datos.hero[0].url + ")",
                backgroundPosition:
                  datos.hero[0].focoX + "% " + datos.hero[0].focoY + "%",
              }
            : undefined
        }
      >
        <div>
          <h1>{datos.titulo}</h1>
          <p>{datos.descripcion}</p>
        </div>
      </div>
      <div className="mini-identidad">
        <div className="mini-identidad__marca">
          {datos.logoUrl && (
            <img className="mini-logo-identidad" src={datos.logoUrl} alt="" />
          )}
          <div>
            <strong>{datos.titulo}</strong>
            <p>{datos.descripcion}</p>
          </div>
        </div>
        <div className="mini-avatar-group">
          {profesionales.slice(0, 5).map((profesional) => (
            <span key={profesional.id} title={profesional.nombre}>
              {profesional.foto ? (
                <img src={profesional.foto} alt="" />
              ) : (
                iniciales(`${profesional.nombre} ${profesional.apellido ?? ""}`)
              )}
            </span>
          ))}
        </div>
        {locales[0] && (
          <small>
            <MapPin /> {locales[0].nombre} ·{" "}
            {locales[0].direccion || "Dirección pendiente"}
          </small>
        )}
      </div>
      <section>
        <small>SERVICIOS</small>
        <h2>Elegí tu próximo turno</h2>
        <div className="mini-catalogo">
          <nav>
            {Object.keys(categorias).map((categoria) => (
              <span key={categoria}>{categoria}</span>
            ))}
          </nav>
          <div>
            {Object.entries(categorias)
              .slice(0, 2)
              .map(([categoria, items]) => (
                <article key={categoria}>
                  <strong>{categoria}</strong>
                  {items.slice(0, 2).map((servicio) => (
                    <p key={servicio.id}>
                      <span>{servicio.nombre}</span>
                      <b>{pesos(servicio.precio)}</b>
                    </p>
                  ))}
                </article>
              ))}
          </div>
        </div>
      </section>
      {datos.secciones.includes("ubicacion") && locales[0] && (
        <section className="mini-ubicacion">
          <MapPin />
          <div>
            <strong>{locales[0]!.nombre}</strong>
            <p>{locales[0]!.direccion || "Dirección pendiente"}</p>
            {locales[0]!.googlePuntaje && (
              <small>
                {locales[0]!.googlePuntaje} · {locales[0]!.googleResenas ?? 0}{" "}
                valoraciones
              </small>
            )}
          </div>
        </section>
      )}
      {datos.whatsapp.replace(/\D/g, "").length >= 8 && (
        <a
          className="mini-whatsapp"
          href={`https://wa.me/${datos.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function iniciales(valor: string) {
  return valor
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}
