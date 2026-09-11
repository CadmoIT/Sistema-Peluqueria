/** Guía la carga, asociación, revisión y confirmación de un archivo de clientes. */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";

type CampoCliente = "ignorar" | "nombre" | "apellido" | "email" | "telefono";

type Previsualizacion = {
  encabezados: string[];
  filas: string[][];
  totalFilas: number;
  recortado: boolean;
};

type Resultado = {
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: Array<{ fila: number; mensaje: string }>;
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

  const filasPreparadas = useMemo(() => {
    if (!previsualizacion) return [];
    return previsualizacion.filas.map((fila, indice) => {
      const cliente: Record<string, string | number> = { fila: indice + 2 };
      asociacion.forEach((campo, columna) => {
        if (campo !== "ignorar") cliente[campo] = fila[columna] ?? "";
      });
      return cliente;
    });
  }, [asociacion, previsualizacion]);

  async function seleccionarArchivo(archivo?: File) {
    if (!archivo) return;
    setCargando(true);
    setMensaje("");
    const datos = new FormData();
    datos.set("archivo", archivo);
    const respuesta = await fetch(
      "/api/v1/clientes/importacion/previsualizar",
      { method: "POST", body: datos },
    );
    const contenido = (await respuesta.json()) as Previsualizacion & {
      mensaje?: string;
    };
    setCargando(false);

    if (!respuesta.ok) {
      setMensaje(contenido.mensaje ?? "No pudimos leer el archivo.");
      return;
    }

    setPrevisualizacion(contenido);
    setAsociacion(contenido.encabezados.map(detectarCampo));
  }

  async function confirmar() {
    if (!filasPreparadas.length) return;
    setCargando(true);
    setMensaje("");
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
    router.refresh();
  }

  function cerrar() {
    setAbierto(false);
    setPrevisualizacion(null);
    setAsociacion([]);
    setMensaje("");
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
                      asociacion.every((campo) => campo === "ignorar")
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

function detectarCampo(encabezado: string): CampoCliente {
  const normalizado = encabezado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (["nombre", "name", "first name"].includes(normalizado)) return "nombre";
  if (["apellido", "last name", "surname"].includes(normalizado))
    return "apellido";
  if (["email", "correo", "correo electronico"].includes(normalizado))
    return "email";
  if (["telefono", "celular", "phone", "whatsapp"].includes(normalizado))
    return "telefono";
  return "ignorar";
}
