/** Carga imágenes a Cloudinary y conserva una URL manual como alternativa editable. */
"use client";

import { useEffect, useId, useState } from "react";
import { ImageUp, LoaderCircle } from "lucide-react";
import { subirImagenCloudinary } from "./subir-imagen-cloudinary";

type Propiedades = {
  name: string;
  etiqueta: string;
  tipo: string;
  valor?: string;
  valorInicial?: string;
  alCambiar?: (valor: string) => void;
  soloCarga?: boolean;
};

export function CampoImagen({
  name,
  etiqueta,
  tipo,
  valor: valorControlado,
  valorInicial = "",
  alCambiar,
  soloCarga = false,
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
      actualizar(await subirImagenCloudinary(archivo, tipo));
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
    <div className={`campo-imagen ${soloCarga ? "campo-imagen--solo-carga" : ""}`}>
      <label>{etiqueta}</label>
      <input name={name} type="hidden" value={valor} />
      <div>
        {!soloCarga && (
          <input
            id={`${id}-url`}
            type="url"
            value={valor}
            onChange={(evento) => actualizar(evento.target.value)}
            placeholder="Pegá una URL o cargá un archivo"
          />
        )}
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
