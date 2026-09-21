/** Permite editar el micrositio con controles visuales y lenguaje cotidiano. */
/* eslint-disable @next/next/no-img-element -- La vista previa acepta imágenes propias y URLs temporales. */
"use client";

import { useState, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Globe2,
  MapPin,
  MessageCircle,
  Palette,
  Save,
  UsersRound,
} from "lucide-react";
import {
  guardarBorradorSitio,
  publicarSitio,
} from "@/app/panel/mi-sitio/acciones";
import { BotonEnvio } from "@/componentes/panel/boton-envio";
import { CampoImagen } from "@/componentes/panel/campo-imagen";

export type BorradorSitio = {
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

type LocalSitio = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string | null;
  googlePuntaje: number | null;
  googleResenas: number | null;
};

const nombresSecciones = {
  servicios: "Servicios",
  equipo: "Profesionales",
  ubicacion: "Contacto y ubicación",
};
const coloresFrecuentes = [
  "#126783",
  "#111111",
  "#ffffff",
  "#2a9fba",
  "#1f7a5c",
  "#b65f3a",
  "#815b8f",
  "#ead8c4",
];

export function EditorSitio({
  inicial,
  slug,
  servicios,
  profesionales,
  locales,
}: {
  inicial: BorradorSitio;
  slug: string;
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
  const [datos, setDatos] = useState(inicial);
  const cambiar = (campo: keyof BorradorSitio, valor: string | boolean) =>
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  const cambiarHero = (
    indice: number,
    campo: "url" | "alt" | "focoX" | "focoY",
    valor: string | number,
  ) =>
    setDatos((actual) => ({
      ...actual,
      hero: Array.from({ length: 3 }, (_, i) =>
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

  function moverHero(indice: number, direccion: -1 | 1) {
    setDatos((actual) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= actual.hero.length) return actual;
      const hero = [...actual.hero];
      [hero[indice], hero[destino]] = [hero[destino]!, hero[indice]!];
      return { ...actual, hero };
    });
  }

  function alternarSeccion(seccion: BorradorSitio["secciones"][number]) {
    setDatos((actual) => ({
      ...actual,
      secciones: actual.secciones.includes(seccion)
        ? actual.secciones.filter((item) => item !== seccion)
        : [...actual.secciones, seccion],
    }));
  }

  function moverSeccion(indice: number, direccion: -1 | 1) {
    setDatos((actual) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= actual.secciones.length) return actual;
      const secciones = [...actual.secciones];
      [secciones[indice], secciones[destino]] = [
        secciones[destino]!,
        secciones[indice]!,
      ];
      return { ...actual, secciones };
    });
  }

  const seccionesEditor = [
    ...datos.secciones,
    ...(Object.keys(nombresSecciones) as BorradorSitio["secciones"]).filter(
      (seccion) => !datos.secciones.includes(seccion),
    ),
  ];

  return (
    <div className="editor-sitio editor-sitio--simple">
      <form action={guardarBorradorSitio} className="editor-controles">
        <div className="editor-controles__titulo">
          <div>
            <small>BORRADOR</small>
            <h2>Diseño de tu página</h2>
          </div>
          <Save />
        </div>

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
              nombre="colorPrincipal"
              etiqueta="Principal"
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
            {[0, 1, 2].map((indice) => (
              <div className="imagen-editor" key={indice}>
                <div>
                  <strong>Imagen {indice + 1}</strong>
                  <span>
                    <button
                      type="button"
                      onClick={() => moverHero(indice, -1)}
                      aria-label="Mover imagen hacia arriba"
                    >
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverHero(indice, 1)}
                      aria-label="Mover imagen hacia abajo"
                    >
                      <ArrowDown />
                    </button>
                  </span>
                </div>
                <CampoImagen
                  name={"hero" + (indice + 1)}
                  etiqueta="Imagen"
                  tipo="portada"
                  valor={datos.hero[indice]?.url ?? ""}
                  alCambiar={(valor) => cambiarHero(indice, "url", valor)}
                />
                <label>
                  ¿Qué se ve en esta foto? <small>(opcional)</small>
                  <input
                    name={"heroAlt" + (indice + 1)}
                    value={datos.hero[indice]?.alt ?? ""}
                    onChange={(evento) =>
                      cambiarHero(indice, "alt", evento.target.value)
                    }
                    placeholder="Por ejemplo: interior luminoso del local"
                  />
                  <small>
                    Ayuda a quienes navegan con un lector de pantalla.
                  </small>
                </label>
                {datos.hero[indice]?.url && (
                  <SelectorFoco
                    imagen={datos.hero[indice].url}
                    x={datos.hero[indice].focoX}
                    y={datos.hero[indice].focoY}
                    alCambiar={(x, y) => {
                      cambiarHero(indice, "focoX", x);
                      cambiarHero(indice, "focoY", y);
                    }}
                  />
                )}
                <input
                  type="hidden"
                  name={"heroFocoX" + (indice + 1)}
                  value={datos.hero[indice]?.focoX ?? 50}
                />
                <input
                  type="hidden"
                  name={"heroFocoY" + (indice + 1)}
                  value={datos.hero[indice]?.focoY ?? 50}
                />
              </div>
            ))}
            <label className="check-editor">
              <input
                name="carruselAutomatico"
                type="checkbox"
                checked={datos.carruselAutomatico}
                onChange={(evento) =>
                  cambiar("carruselAutomatico", evento.target.checked)
                }
              />
              Cambiar la imagen cada 5 segundos
            </label>
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Contenido</summary>
          <div>
            <fieldset className="secciones-editor">
              <legend>Secciones visibles y orden</legend>
              {seccionesEditor.map((seccion) => {
                const posicion = datos.secciones.indexOf(seccion);
                return (
                  <div key={seccion}>
                    <label>
                      <input
                        type="checkbox"
                        checked={posicion >= 0}
                        onChange={() => alternarSeccion(seccion)}
                      />
                      {nombresSecciones[seccion]}
                    </label>
                    {posicion >= 0 && (
                      <span>
                        <input type="hidden" name="secciones" value={seccion} />
                        <button
                          type="button"
                          onClick={() => moverSeccion(posicion, -1)}
                          aria-label={"Subir " + nombresSecciones[seccion]}
                        >
                          <ArrowUp />
                        </button>
                        <button
                          type="button"
                          onClick={() => moverSeccion(posicion, 1)}
                          aria-label={"Bajar " + nombresSecciones[seccion]}
                        >
                          <ArrowDown />
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </fieldset>
            <fieldset className="selector-multiple">
              <legend>Servicios que querés destacar</legend>
              {servicios.length ? (
                servicios.map((servicio) => (
                  <label key={servicio.id}>
                    <input
                      type="checkbox"
                      name="serviciosDestacados"
                      value={servicio.id}
                      checked={datos.serviciosDestacados.includes(servicio.id)}
                      onChange={(evento) =>
                        setDatos((actual) => ({
                          ...actual,
                          serviciosDestacados: evento.target.checked
                            ? [...actual.serviciosDestacados, servicio.id]
                            : actual.serviciosDestacados.filter(
                                (id) => id !== servicio.id,
                              ),
                        }))
                      }
                    />
                    {servicio.nombre}
                  </label>
                ))
              ) : (
                <p>Cargá servicios para mostrarlos en tu página.</p>
              )}
            </fieldset>
          </div>
        </details>

        <details className="grupo-editor">
          <summary>Contacto y ubicación</summary>
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
                <p className="aviso-ajustes">Agregá un teléfono para mostrar el botón de contacto en tu página. También podés cargarlo en Datos del local.</p>
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
            <div className="resumen-contenido-sitio">
              <span>
                <UsersRound /> {profesionales.length} profesionales
              </span>
              <span>
                <MapPin /> {locales.length}{" "}
                {locales.length === 1 ? "local" : "locales"}
              </span>
            </div>
            {!locales.length && (
              <a href="/panel/configuracion/locales">
                Completar datos del local
              </a>
            )}
          </div>
        </details>

        <BotonEnvio pendiente="Guardando borrador…">
          <Save /> Guardar borrador
        </BotonEnvio>
      </form>

      <section className="editor-preview">
        <div className="editor-preview__barra">
          <span>
            <Eye /> Vista previa
          </span>
          <a href={"/sitio/" + slug} target="_blank">
            Abrir sitio
          </a>
        </div>
        <VistaPrevia
          datos={datos}
          servicios={servicios}
          profesionales={profesionales}
          locales={locales}
        />
      </section>

      <form action={publicarSitio} className="barra-publicar">
        <div>
          <Globe2 />
          <span>
            <strong>¿Todo listo?</strong>
            <small>
              Publicá el borrador para que tus clientes vean los cambios.
            </small>
          </span>
        </div>
        <BotonEnvio pendiente="Publicando…">Publicar cambios</BotonEnvio>
      </form>
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
  function elegir(evento: MouseEvent<HTMLButtonElement>) {
    const limites = evento.currentTarget.getBoundingClientRect();
    alCambiar(
      Math.round(((evento.clientX - limites.left) / limites.width) * 100),
      Math.round(((evento.clientY - limites.top) / limites.height) * 100),
    );
  }
  return (
    <div className="selector-foco">
      <span>Parte importante de la foto</span>
      <button
        type="button"
        onClick={elegir}
        style={{ backgroundImage: "url(" + imagen + ")" }}
        aria-label="Elegir la parte importante tocando la imagen"
      >
        <i style={{ left: x + "%", top: y + "%" }} />
      </button>
      <div aria-label="Posiciones rápidas">
        {[0, 1, 2].flatMap((fila) =>
          [0, 1, 2].map((columna) => (
            <button
              type="button"
              key={fila + "-" + columna}
              aria-label={"Posición " + (fila * 3 + columna + 1)}
              onClick={() => alCambiar(columna * 50, fila * 50)}
            />
          )),
        )}
      </div>
    </div>
  );
}

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
        {datos.logoUrl && (
          <img className="mini-logo" src={datos.logoUrl} alt="" />
        )}
        <div>
          <h1>{datos.titulo}</h1>
          <p>{datos.descripcion}</p>
        </div>
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
      {datos.secciones.includes("equipo") && (
        <section>
          <small>PROFESIONALES</small>
          <div className="mini-equipo">
            {profesionales.slice(0, 4).map((profesional) => (
              <span key={profesional.id}>
                <i>{profesional.nombre[0]}</i>
                <b>{profesional.nombre}</b>
              </span>
            ))}
          </div>
        </section>
      )}
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
