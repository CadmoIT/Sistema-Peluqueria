/** Permite editar el borrador del micrositio y observar los cambios antes de publicarlos. */
/* eslint-disable @next/next/no-img-element -- La vista previa debe aceptar URLs temporales antes de subir a R2. */
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, Globe2, Save } from "lucide-react";
import {
  guardarBorradorSitio,
  publicarSitio,
} from "@/app/panel/mi-sitio/acciones";
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

const nombresSecciones = {
  servicios: "Servicios",
  equipo: "Equipo",
  ubicacion: "Ubicación y contacto",
};

export function EditorSitio({
  inicial,
  slug,
  servicios,
  profesionales,
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
    <div className="editor-sitio">
      <form action={guardarBorradorSitio} className="editor-controles">
        <div className="editor-controles__titulo">
          <div>
            <small>BORRADOR</small>
            <h2>Diseño de tu página</h2>
          </div>
          <Save />
        </div>
        <label>
          Nombre visible
          <input
            name="titulo"
            value={datos.titulo}
            onChange={(e) => cambiar("titulo", e.target.value)}
          />
        </label>
        <label>
          Descripción
          <textarea
            name="descripcion"
            rows={4}
            value={datos.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Colores</legend>
          <div className="colores-editor">
            <label>
              Principal
              <input
                name="colorPrincipal"
                type="color"
                value={datos.colorPrincipal}
                onChange={(e) => cambiar("colorPrincipal", e.target.value)}
              />
            </label>
            <label>
              Fondo
              <input
                name="colorFondo"
                type="color"
                value={datos.colorFondo}
                onChange={(e) => cambiar("colorFondo", e.target.value)}
              />
            </label>
            <label>
              Texto
              <input
                name="colorTexto"
                type="color"
                value={datos.colorTexto}
                onChange={(e) => cambiar("colorTexto", e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <CampoImagen
          name="logoUrl"
          etiqueta="Logo"
          tipo="logo"
          valor={datos.logoUrl}
          alCambiar={(valor) => cambiar("logoUrl", valor)}
        />
        <fieldset>
          <legend>Portada · hasta 3 imágenes</legend>
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
                name={`hero${indice + 1}`}
                etiqueta="Imagen"
                tipo="portada"
                valor={datos.hero[indice]?.url ?? ""}
                alCambiar={(valor) => cambiarHero(indice, "url", valor)}
              />
              <label>
                Descripción para accesibilidad
                <input
                  name={`heroAlt${indice + 1}`}
                  value={datos.hero[indice]?.alt ?? ""}
                  onChange={(e) => cambiarHero(indice, "alt", e.target.value)}
                  placeholder="Interior del local..."
                />
              </label>
              <div className="form-grid">
                <label>
                  Foco horizontal
                  <input
                    name={`heroFocoX${indice + 1}`}
                    type="range"
                    min="0"
                    max="100"
                    value={datos.hero[indice]?.focoX ?? 50}
                    onChange={(e) =>
                      cambiarHero(indice, "focoX", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Foco vertical
                  <input
                    name={`heroFocoY${indice + 1}`}
                    type="range"
                    min="0"
                    max="100"
                    value={datos.hero[indice]?.focoY ?? 50}
                    onChange={(e) =>
                      cambiarHero(indice, "focoY", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <label className="check-editor">
            <input
              name="carruselAutomatico"
              type="checkbox"
              checked={datos.carruselAutomatico}
              onChange={(e) => cambiar("carruselAutomatico", e.target.checked)}
            />{" "}
            Cambiar cada 5 segundos
          </label>
        </fieldset>
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
                      aria-label={`Subir ${nombresSecciones[seccion]}`}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverSeccion(posicion, 1)}
                      aria-label={`Bajar ${nombresSecciones[seccion]}`}
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
          <legend>Servicios destacados</legend>
          {servicios.map((servicio) => (
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
          ))}
        </fieldset>
        <div className="form-grid">
          <label>
            WhatsApp
            <input
              name="whatsapp"
              value={datos.whatsapp}
              onChange={(e) => cambiar("whatsapp", e.target.value)}
            />
          </label>
          <label>
            Instagram
            <input
              name="instagram"
              value={datos.instagram}
              onChange={(e) => cambiar("instagram", e.target.value)}
            />
          </label>
        </div>
        <button className="boton boton--primario">
          <Save /> Guardar borrador
        </button>
      </form>
      <section className="editor-preview">
        <div className="editor-preview__barra">
          <span>
            <Eye /> Vista previa
          </span>
          <a href={`/sitio/${slug}`} target="_blank">
            Abrir sitio
          </a>
        </div>
        <VistaPrevia
          datos={datos}
          servicios={servicios}
          profesionales={profesionales}
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
        <button className="boton boton--primario">Publicar cambios</button>
      </form>
    </div>
  );
}

function VistaPrevia({
  datos,
  servicios,
  profesionales,
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
}) {
  const estilo = {
    "--sitio-principal": datos.colorPrincipal,
    "--sitio-fondo": datos.colorFondo,
    "--sitio-texto": datos.colorTexto,
  } as React.CSSProperties;
  return (
    <div className="mini-sitio" style={estilo}>
      <header>
        {datos.logoUrl ? (
          <img src={datos.logoUrl} alt="" />
        ) : (
          <strong>{datos.titulo}</strong>
        )}
        <button>Reservar</button>
      </header>
      <div
        className="mini-hero"
        style={
          datos.hero[0]?.url
            ? {
                backgroundImage: `url(${datos.hero[0].url})`,
                backgroundPosition: `${datos.hero[0].focoX}% ${datos.hero[0].focoY}%`,
              }
            : undefined
        }
      >
        <div>
          <small>RESERVAS ONLINE</small>
          <h1>{datos.titulo}</h1>
          <p>{datos.descripcion}</p>
          <button>Elegir un turno</button>
        </div>
      </div>
      <section>
        <small>SERVICIOS</small>
        <h2>Encontrá tu próximo turno</h2>
        <div className="mini-servicios">
          {servicios.slice(0, 3).map((servicio) => (
            <article key={servicio.id}>
              <span>{servicio.categoria}</span>
              <strong>{servicio.nombre}</strong>
              <b>
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                }).format(servicio.precio)}
              </b>
            </article>
          ))}
        </div>
      </section>
      <section>
        <small>EQUIPO</small>
        <div className="mini-equipo">
          {profesionales.slice(0, 4).map((profesional) => (
            <span key={profesional.id}>
              <i>{profesional.nombre[0]}</i>
              <b>{profesional.nombre}</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
