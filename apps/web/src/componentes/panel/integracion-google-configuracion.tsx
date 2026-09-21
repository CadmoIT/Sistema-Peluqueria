/** Configuración sencilla de Google Calendar para todo el negocio. */
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SiGooglecalendar } from "react-icons/si";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

type Conexion = {
  id: string;
  nombre: string;
  estado: string;
  ultimoError: string | null;
  sincronizadoEn: string | null;
};

export function IntegracionGoogleConfiguracion({
  disponible,
  conexiones,
}: {
  disponible: boolean;
  conexiones: Conexion[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const activas = conexiones.filter((conexion) => conexion.estado === "ACTIVA");
  const conectadas = conexiones.filter((conexion) => conexion.estado !== "PENDIENTE");

  async function gestionar(conexionId: string, accion: "sincronizar" | "desconectar") {
    iniciar(async () => {
      try {
        if (accion === "desconectar" && !window.confirm("¿Desconectar Google Calendar? Tus eventos se conservarán, pero dejarán de sincronizarse.")) return;
        const respuesta = await fetch(`/api/integraciones/google-calendar/${accion}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conexionId }),
        });
        const datos = (await respuesta.json()) as { ok?: boolean; mensaje?: string };
        if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje ?? "No pudimos completar la operación.");
        toast.success(datos.mensaje ?? "Google Calendar quedó actualizado.");
        router.refresh();
      } catch (error) {
        if (error instanceof Error) toast.error(error.message);
      }
    });
  }

  return (
    <section className="integracion-google-configuracion" aria-labelledby="integracion-google-titulo">
      <header className="integracion-google-configuracion__cabecera">
        <div className="integracion-google-configuracion__marca">
          <span className="integracion-google-configuracion__icono" aria-hidden="true">
            <SiGooglecalendar />
          </span>
          <div>
            <h2 id="integracion-google-titulo">Google Calendar</h2>
            <p>Sincronizá tus turnos con un calendario separado de Google. Tus eventos personales quedan intactos.</p>
          </div>
        </div>
        <span className={`integracion-google-configuracion__estado ${activas.length ? "esta-conectado" : conectadas.length ? "esta-atencion" : "esta-desconectado"}`}>
          {activas.length ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
          {activas.length ? "Conectado" : conectadas.length ? "Requiere atención" : "Sin conectar"}
        </span>
      </header>

      {!disponible && (
        <p className="integracion-google-configuracion__aviso" role="status">
          Google Calendar todavía no está habilitado en este entorno. Cuando estén listas las credenciales, vas a poder conectarlo desde acá.
        </p>
      )}

      {conectadas.length > 0 && (
        <div className="integracion-google-configuracion__lista">
          {conectadas.map((conexion) => (
            <article className="integracion-google-configuracion__conexion" key={conexion.id}>
              <div>
                <strong>{conexion.nombre || "Calendario de TurnosRápidos"}</strong>
                <small>
                  {conexion.sincronizadoEn
                    ? `Última sincronización: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" }).format(new Date(conexion.sincronizadoEn))}`
                    : "Sincronización activa"}
                </small>
                {conexion.ultimoError && <small className="integracion-google-configuracion__error">Necesita atención: {conexion.ultimoError}</small>}
              </div>
              <div className="integracion-google-configuracion__acciones">
                <button type="button" className="boton boton--secundario" disabled={pendiente || !disponible} onClick={() => void gestionar(conexion.id, "sincronizar")}>
                  <RefreshCw aria-hidden="true" /> Sincronizar
                </button>
                <button type="button" className="boton boton--secundario" disabled={pendiente} onClick={() => void gestionar(conexion.id, "desconectar")}>
                  <Unplug aria-hidden="true" /> Desconectar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="integracion-google-configuracion__pie">
        <div>
          <strong>{activas.length ? "¿Querés conectar otra cuenta?" : "Conectá tu cuenta de Google"}</strong>
          <p>La conexión crea un calendario exclusivo para TurnosRápidos y sincroniza allí los turnos.</p>
        </div>
        <a className="boton boton--primario" href={disponible ? "/api/integraciones/google-calendar/conectar" : undefined} aria-disabled={!disponible} onClick={(evento) => { if (!disponible) evento.preventDefault(); }}>
          <SiGooglecalendar aria-hidden="true" /> {activas.length ? "Conectar otra cuenta" : "Conectar Google Calendar"}
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
