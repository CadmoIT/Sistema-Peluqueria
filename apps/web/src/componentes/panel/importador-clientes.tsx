/** Guía la carga, asociación, revisión y confirmación de un archivo de clientes. */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { detectarCampo, type CampoCliente } from "@/lib/clientes-archivo";
import { useCierreExterior } from "@/componentes/interaccion/cierre-exterior";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";

type Previsualizacion = {
  encabezados: string[];
  filas: string[][];
  totalFilas: number;
  recortado: boolean;
  numerosFilas: number[];
};

type Resultado = {
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: Array<{ fila: number; mensaje: string }>;
};
type Revision = Resultado & {
  clave: string;
  operaciones: Array<{ fila: number; tipo: string; mensaje: string }>;
};

const campos: Array<{ valor: CampoCliente; etiqueta: string }> = [
  { valor: "ignorar", etiqueta: "No importar" },
  { valor: "nombre", etiqueta: "Nombre" },
  { valor: "apellido", etiqueta: "Apellido" },
  { valor: "email", etiqueta: "Correo" },
  { valor: "telefono", etiqueta: "Teléfono" },
];

export function ImportadorClientes() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [previsualizacion, setPrevisualizacion] =
    useState<Previsualizacion | null>(null);
  const [asociacion, setAsociacion] = useState<CampoCliente[]>([]);
  const [completarExistentes, setCompletarExistentes] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [revision, setRevision] = useState<Revision | null>(null);
  const [revisando, setRevisando] = useState(false);
  const dialogo = useRef<HTMLElement>(null);
  const lectura = useRef<AbortController | null>(null);
  useEffect(() => () => lectura.current?.abort(), []);
  useCierreExterior(dialogo, cerrar, abierto);

  const filasPreparadas = useMemo(() => {
    if (!previsualizacion) return [];
    return previsualizacion.filas.map((fila, indice) => {
      const cliente: Record<string, string | number> = {
        fila: previsualizacion.numerosFilas?.[indice] ?? indice + 2,
      };
      asociacion.forEach((campo, columna) => {
        if (campo !== "ignorar") cliente[campo] = fila[columna] ?? "";
      });
      return cliente;
    });
  }, [asociacion, previsualizacion]);
  const asignados = asociacion.filter((campo) => campo !== "ignorar");
  const repetidos = new Set(asignados).size !== asignados.length;
  const claveRevision = JSON.stringify({
    filas: filasPreparadas,
    completarExistentes,
  });
  const revisar = Boolean(
    previsualizacion &&
    filasPreparadas.length &&
    asignados.length &&
    !repetidos,
  );
  useEffect(() => {
    setRevision(null);
    if (!revisar) {
      setRevisando(false);
      return;
    }
    const controlador = new AbortController();
    setRevisando(true);
    const espera = setTimeout(async () => {
      try {
        const respuesta = await fetch("/api/v1/clientes/importacion/revisar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: claveRevision,
          signal: controlador.signal,
        });
        const datos = await respuesta.json();
        if (!respuesta.ok)
          throw new Error(datos.mensaje || "No pudimos revisar el archivo.");
        if (!controlador.signal.aborted) {
          setRevision({ ...datos, clave: claveRevision });
          setMensaje("");
        }
      } catch (error) {
        if (!controlador.signal.aborted)
          setMensaje(
            error instanceof Error
              ? error.message
              : "No pudimos revisar el archivo.",
          );
      } finally {
        if (!controlador.signal.aborted) setRevisando(false);
      }
    }, 300);
    return () => {
      clearTimeout(espera);
      controlador.abort();
    };
  }, [claveRevision, revisar]);

  async function seleccionarArchivo(archivo?: File) {
    if (!archivo) return;
    lectura.current?.abort();
    const controlador = new AbortController();
    lectura.current = controlador;
    setCargando(true);
    setMensaje("");
    const datos = new FormData();
    datos.set("archivo", archivo);
    try {
      const respuesta = await fetch(
        "/api/v1/clientes/importacion/previsualizar",
        { method: "POST", body: datos, signal: controlador.signal },
      );
      const contenido = (await respuesta.json()) as Previsualizacion & {
        mensaje?: string;
      };
      if (controlador.signal.aborted) return;
      setCargando(false);

      if (!respuesta.ok) {
        setMensaje(contenido.mensaje ?? "No pudimos leer el archivo.");
        return;
      }

      setPrevisualizacion(contenido);
      setAsociacion(contenido.encabezados.map(detectarCampo));
    } catch {
      if (!controlador.signal.aborted)
        setMensaje(
          "No pudimos leer el archivo. Revisá tu conexión e intentá nuevamente.",
        );
    } finally {
      if (lectura.current === controlador) setCargando(false);
    }
  }

  async function confirmar() {
    if (
      !revision ||
      revision.clave !== claveRevision ||
      repetidos ||
      revisando ||
      cargando
    )
      return;
    setCargando(true);
    setMensaje("");
    try {
      const respuesta = await fetch("/api/v1/clientes/importacion/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filas: filasPreparadas,
          completarExistentes,
        }),
      });
      const resultado = (await respuesta.json()) as Resultado & {
        mensaje?: string;
      };
      setCargando(false);

      if (!respuesta.ok) {
        setMensaje(resultado.mensaje ?? "No pudimos importar los clientes.");
        return;
      }

      setMensaje(
        `${resultado.creados} creados · ${resultado.actualizados} actualizados · ${resultado.omitidos} omitidos · ${resultado.errores.length} con errores`,
      );
      toast.success(
        `${resultado.creados} clientes creados · ${resultado.actualizados} completados · ${resultado.omitidos} omitidos · ${resultado.errores.length} con errores`,
      );
      setPrevisualizacion(null);
      setRevision(null);
      router.refresh();
    } catch {
      setMensaje("No pudimos confirmar la importación. Revisá tu conexión.");
    } finally {
      setCargando(false);
    }
  }

  function cerrar() {
    lectura.current?.abort();
    lectura.current = null;
    setCargando(false);
    setAbierto(false);
    setPrevisualizacion(null);
    setAsociacion([]);
    setMensaje("");
    setRevision(null);
  }

  return (
    <>
      <button
        className="boton boton--secundario"
        type="button"
        onClick={() => setAbierto(true)}
      >
        <Upload /> Importar
      </button>
      {abierto && (
        <div className="dialogo-fondo" role="presentation">
          <section
            ref={dialogo}
            className="dialogo-importacion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-importacion"
          >
            <header>
              <div>
                <small>CSV O EXCEL</small>
                <h2 id="titulo-importacion">Importar clientes</h2>
              </div>
              <button
                type="button"
                className="accion-icono"
                onClick={cerrar}
                aria-label="Cerrar importación"
              >
                <X />
              </button>
            </header>

            {!previsualizacion ? (
              <label className="selector-archivo">
                {cargando ? (
                  <LoaderCircle className="girando" />
                ) : (
                  <FileSpreadsheet />
                )}
                <strong>Elegí tu archivo de clientes</strong>
                <span>Hasta 1.000 filas y 5 MB. Formatos .csv y .xlsx.</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={cargando}
                  onChange={(evento) =>
                    seleccionarArchivo(evento.target.files?.[0])
                  }
                />
              </label>
            ) : (
              <>
                <p className="ayuda-importacion">
                  Indicá qué dato representa cada columna antes de guardar.
                  {previsualizacion.recortado &&
                    " Se importarán las primeras 1.000 filas."}
                </p>
                <div className="asociacion-columnas">
                  {previsualizacion.encabezados.map((encabezado, indice) => (
                    <label key={`${encabezado}-${indice}`}>
                      <span>{encabezado}</span>
                      <select
                        value={asociacion[indice] ?? "ignorar"}
                        onChange={(evento) =>
                          setAsociacion((actual) =>
                            actual.map((campo, posicion) =>
                              posicion === indice
                                ? (evento.target.value as CampoCliente)
                                : campo,
                            ),
                          )
                        }
                      >
                        {campos.map((campo) => (
                          <option value={campo.valor} key={campo.valor}>
                            {campo.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="previsualizacion-importacion">
                  <table>
                    <thead>
                      <tr>
                        {previsualizacion.encabezados.map(
                          (encabezado, indice) => (
                            <th key={`${encabezado}-${indice}`}>
                              {encabezado}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previsualizacion.filas
                        .slice(0, 8)
                        .map((fila, indice) => (
                          <tr key={indice}>
                            {previsualizacion.encabezados.map((_, columna) => (
                              <td key={columna}>
                                {fila[columna] || "Sin dato"}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <label className="check-importacion">
                  <input
                    type="checkbox"
                    checked={completarExistentes}
                    onChange={(evento) =>
                      setCompletarExistentes(evento.target.checked)
                    }
                  />
                  Completar datos vacíos de clientes que ya existen
                </label>
                {repetidos && (
                  <p role="alert">
                    Cada dato debe corresponder a una sola columna. Cambiá las
                    asignaciones repetidas a “No importar”.
                  </p>
                )}
                {revisando && (
                  <p role="status">Revisando datos y posibles duplicados…</p>
                )}
                {revision?.clave === claveRevision && (
                  <div className="revision-importacion">
                    <p role="status">
                      {revision.creados} nuevos · {revision.actualizados} para
                      completar · {revision.omitidos} omitidos ·{" "}
                      {revision.errores.length} con errores
                    </p>
                    <p>
                      Se guardarán sólo las filas válidas. Los datos existentes
                      no se reemplazan.
                    </p>
                    {!!revision.errores.length && (
                      <ul aria-label="Filas con errores">
                        {revision.errores.map((error) => (
                          <li key={error.fila}>
                            Fila {error.fila}: {error.mensaje}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!!revision.omitidos && (
                      <details>
                        <summary>Ver filas omitidas</summary>
                        <ul>
                          {revision.operaciones
                            .filter((o) => o.tipo === "OMITIR")
                            .map((o) => (
                              <li key={o.fila}>
                                Fila {o.fila}: {o.mensaje}
                              </li>
                            ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                <footer>
                  <button
                    type="button"
                    className="boton boton--secundario"
                    onClick={() => setPrevisualizacion(null)}
                  >
                    Elegir otro archivo
                  </button>
                  <button
                    type="button"
                    className="boton boton--primario"
                    disabled={
                      cargando ||
                      revisando ||
                      repetidos ||
                      !revision ||
                      revision.clave !== claveRevision ||
                      !(revision.creados + revision.actualizados)
                    }
                    onClick={confirmar}
                  >
                    {cargando ? (
                      <LoaderCircle className="girando" />
                    ) : (
                      <Upload />
                    )}
                    Confirmar importación
                  </button>
                </footer>
              </>
            )}
            {mensaje && <p className="mensaje-importacion">{mensaje}</p>}
          </section>
        </div>
      )}
    </>
  );
}
