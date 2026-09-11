/** Ofrece carga segura a R2 y conserva una URL manual como alternativa editable. */
"use client";

import { useEffect, useId, useState } from "react";
import { ImageUp, LoaderCircle } from "lucide-react";

type Propiedades = {
  name: string;
  etiqueta: string;
  tipo: string;
  valor?: string;
  valorInicial?: string;
  alCambiar?: (valor: string) => void;
};

export function CampoImagen({
  name,
  etiqueta,
  tipo,
  valor: valorControlado,
  valorInicial = "",
  alCambiar,
}: Propiedades) {
  const id = useId();
  const [valor, setValor] = useState(valorControlado ?? valorInicial);
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (valorControlado !== undefined) setValor(valorControlado);
  }, [valorControlado]);

  function actualizar(nuevoValor: string) {
    setValor(nuevoValor);
    alCambiar?.(nuevoValor);
  }

  async function cargar(archivo?: File) {
    if (!archivo) return;
    setCargando(true);
    setEstado("");
    try {
      const formulario = new FormData();
      formulario.set("archivo", archivo);
      formulario.set("tipo", tipo);
      const respuesta = await fetch("/api/v1/archivos/carga", {
        method: "POST",
        body: formulario,
      });
      const datos = (await respuesta.json()) as {
        urlArchivo?: string;
        mensaje?: string;
      };
      if (!respuesta.ok || !datos.urlArchivo) {
        throw new Error(datos.mensaje ?? "No se pudo guardar la imagen.");
      }
      actualizar(datos.urlArchivo);
      setEstado("Imagen cargada.");
    } catch (error) {
      setEstado(
        error instanceof Error ? error.message : "No se pudo cargar la imagen.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="campo-imagen">
      <label htmlFor={`${id}-url`}>{etiqueta}</label>
      <input name={name} type="hidden" value={valor} />
      <div>
        <input
          id={`${id}-url`}
          type="url"
          value={valor}
          onChange={(evento) => actualizar(evento.target.value)}
          placeholder="Pegá una URL o cargá un archivo"
        />
        <label
          className="boton boton--secundario campo-imagen__boton"
          htmlFor={id}
        >
          {cargando ? <LoaderCircle className="girando" /> : <ImageUp />}
          {cargando ? "Cargando" : "Subir"}
        </label>
        <input
          id={id}
          className="campo-imagen__archivo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(evento) => void cargar(evento.target.files?.[0])}
          disabled={cargando}
        />
      </div>
      {estado && <small role="status">{estado}</small>}
    </div>
  );
}
