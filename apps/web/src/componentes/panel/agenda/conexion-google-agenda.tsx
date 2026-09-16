/** Guía la conexión de Google Calendar y muestra estados reales sin simular permisos. */
"use client";
import { useCierreExterior } from "@/componentes/interaccion/cierre-exterior";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SiGooglecalendar } from "react-icons/si";
import { X } from "lucide-react";
import { toast } from "sonner";
type Conexion = {
  id: string;
  nombre: string;
  estado: string;
  ultimoError: string | null;
  sincronizadoEn: string | null;
  sedeId: string | null;
  profesionalId: string | null;
};
export function ConexionGoogleAgenda({
  disponible,
  fecha,
  locales,
  profesionales,
  conexiones,
}: {
  disponible: boolean;
  fecha: string;
  locales: Array<{ id: string; nombre: string }>;
  profesionales: Array<{ id: string; nombre: string }>;
  conexiones: Conexion[];
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        className="boton boton--secundario"
        type="button"
        onClick={() => setAbierto(true)}
      >
        <SiGooglecalendar aria-hidden="true" /> Google Calendar
        {conexiones.some((c) => c.estado === "ACTIVA") && (
          <span className="google-conectado-indicador" aria-label="Conectado" />
        )}
      </button>
      {abierto && (
        <DialogoGoogle
          disponible={disponible}
          fecha={fecha}
          locales={locales}
          profesionales={profesionales}
          conexiones={conexiones}
          cerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
function DialogoGoogle({
  disponible,
  fecha,
  locales,
  profesionales,
  conexiones,
  cerrar,
}: {
  disponible: boolean;
  fecha: string;
  locales: Array<{ id: string; nombre: string }>;
  profesionales: Array<{ id: string; nombre: string }>;
  conexiones: Conexion[];
  cerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useCierreExterior(dialogo, cerrar);
  const router = useRouter();
  const [alcance, setAlcance] = useState("negocio");
  const [local, setLocal] = useState(locales[0]?.id ?? "");
  const [profesional, setProfesional] = useState(profesionales[0]?.id ?? "");
  const [pendiente, iniciar] = useTransition();
  useEffect(() => {
    dialogo.current?.showModal();
  }, []);
  async function gestionar(
    conexionId: string,
    accion: "sincronizar" | "desconectar",
  ) {
    iniciar(async () => {
      try {
        const respuesta = await fetch(
          `/api/integraciones/google-calendar/${accion}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conexionId }),
          },
        );
        const datos = await respuesta.json();
        if (!respuesta.ok || !datos.ok)
          throw new Error(
            datos.mensaje || "No pudimos completar la operación.",
          );
        toast.success(datos.mensaje);
        router.refresh();
        cerrar();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No pudimos completar la operación.",
        );
      }
    });
  }
  const query = new URLSearchParams({ fecha });
  if (alcance === "local") query.set("sedeId", local);
  if (alcance === "profesional") query.set("profesionalId", profesional);
  const conectadas = conexiones.filter((c) => c.estado !== "PENDIENTE");
  return (
    <dialog
      ref={dialogo}
      className="agenda-detalle google-agenda-dialogo"
      onClose={cerrar}
      aria-labelledby="google-agenda-titulo"
    >
      <header>
        <h2 id="google-agenda-titulo">Google Calendar</h2>
        <button
          type="button"
          className="accion-icono"
          aria-label="Cerrar Google Calendar"
          onClick={cerrar}
        >
          <X />
        </button>
      </header>
      <p>
        Para ver tus turnos en el celular, usá esta misma cuenta en Google
        Calendar y activá el calendario TurnosRápidos.
      </p>
      {!disponible && (
        <p className="agenda-aviso" role="status">
          <strong>No configurado.</strong> Todavía faltan las credenciales de
          Google Calendar. No se conectará ninguna cuenta hasta configurarlas.
        </p>
      )}
      {conectadas.map((c) => (
        <section key={c.id} className="google-agenda-conexion">
          <strong>
            {c.profesionalId
              ? profesionales.find((p) => p.id === c.profesionalId)?.nombre ||
                "Profesional"
              : c.sedeId
                ? locales.find((l) => l.id === c.sedeId)?.nombre || "Local"
                : "Todo el negocio"}
          </strong>
          <p>
            {c.estado === "ACTIVA" ? "Conectado" : "Necesita atención"}
            {c.sincronizadoEn &&
              ` · Última sincronización: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" }).format(new Date(c.sincronizadoEn))}`}
          </p>
          {c.ultimoError && (
            <p>
              La sincronización necesita atención. Probá sincronizar o volver a
              conectar la misma cuenta.
            </p>
          )}
          <div>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={pendiente || !disponible}
              onClick={() => gestionar(c.id, "sincronizar")}
            >
              {pendiente ? "Procesando…" : "Sincronizar"}
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={pendiente}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Desconectar este calendario? Los eventos de Google se conservarán, pero dejarán de sincronizarse.",
                  )
                )
                  void gestionar(c.id, "desconectar");
              }}
            >
              Desconectar
            </button>
          </div>
        </section>
      ))}
      <label>
        ¿Qué turnos querés sincronizar?
        <select value={alcance} onChange={(e) => setAlcance(e.target.value)}>
          <option value="negocio">Todo el negocio</option>
          {locales.length > 1 && <option value="local">Un local</option>}
          {profesionales.length > 1 && (
            <option value="profesional">Un profesional</option>
          )}
        </select>
      </label>
      {alcance === "local" && (
        <label>
          Local
          <select value={local} onChange={(e) => setLocal(e.target.value)}>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {alcance === "profesional" && (
        <label>
          Profesional
          <select
            value={profesional}
            onChange={(e) => setProfesional(e.target.value)}
          >
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>
        Crearemos un calendario separado. Tus eventos personales no se leerán ni
        modificarán.
      </p>
      <button
        className="boton boton--primario"
        type="button"
        disabled={!disponible || pendiente}
        onClick={() => {
          window.location.assign(
            `/api/integraciones/google-calendar/conectar?${query}`,
          );
        }}
      >
        Conectar cuenta de Google
      </button>
    </dialog>
  );
}
