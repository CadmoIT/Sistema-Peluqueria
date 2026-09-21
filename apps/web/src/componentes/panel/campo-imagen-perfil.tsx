/** Permite cargar la imagen circular del negocio desde Datos del negocio. */
/* eslint-disable @next/next/no-img-element -- La URL se sirve desde el almacenamiento del negocio. */
"use client";

import { useId, useState } from "react";
import { ImageUp, LoaderCircle } from "lucide-react";

export function CampoImagenPerfil({
  nombreNegocio,
  valorInicial = "",
}: {
  nombreNegocio: string;
  valorInicial?: string;
}) {
  const id = useId();
  const [valor, cambiarValor] = useState(valorInicial);
  const [estado, cambiarEstado] = useState("");
  const [cargando, cambiarCargando] = useState(false);
  const siglas = nombreNegocio
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase() || "TR";

  async function cargar(archivo?: File) {
    if (!archivo) return;
    cambiarCargando(true);
    cambiarEstado("");
    try {
      const formulario = new FormData();
      formulario.set("archivo", archivo);
      formulario.set("tipo", "perfil");
      const respuesta = await fetch("/api/v1/archivos/carga", {
        method: "POST",
        body: formulario,
      });
      const datos = (await respuesta.json()) as { urlArchivo?: string; mensaje?: string };
      if (!respuesta.ok || !datos.urlArchivo) {
        throw new Error(datos.mensaje ?? "No se pudo cargar la imagen.");
      }
      cambiarValor(datos.urlArchivo);
      cambiarEstado("Imagen cargada. Guardá para aplicar el cambio.");
    } catch (error) {
      cambiarEstado(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
    } finally {
      cambiarCargando(false);
    }
  }

  return (
    <div className="campo-imagen-perfil">
      <div className="avatar-negocio">
        {valor ? <img src={valor} alt={`Imagen de ${nombreNegocio}`} /> : <span>{siglas}</span>}
        <label className="avatar-negocio__subir" htmlFor={id}>
          {cargando ? <LoaderCircle className="giro" aria-hidden /> : <ImageUp aria-hidden />}
          <span>{cargando ? "Cargando" : "Subir imagen"}</span>
        </label>
      </div>
      <input name="imagenPerfil" type="hidden" value={valor} />
      <input
        id={id}
        className="campo-imagen-perfil__archivo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(evento) => void cargar(evento.target.files?.[0])}
        disabled={cargando}
      />
      {estado && <small role="status">{estado}</small>}
    </div>
  );
}
