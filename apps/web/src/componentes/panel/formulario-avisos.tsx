/** Permite configurar avisos con una vista previa fácil de entender. */
"use client";

import { useState } from "react";
import { guardarConfiguracionAvisos } from "@/app/panel/configuracion/acciones";
import { BotonEnvio } from "./boton-envio";

type Configuracion = {
  emailConfirmacionActivo: boolean;
  emailRecordatorioActivo: boolean;
  emailAsuntoConfirmacion: string;
  emailTextoConfirmacion: string;
  emailAsuntoRecordatorio: string;
  emailTextoRecordatorio: string;
  whatsappConfirmacionActivo: boolean;
  whatsappRecordatorioActivo: boolean;
};

const ejemplosBase: Record<string, string> = {
  nombre: "Ana",
  negocio: "Tu negocio",
  servicio: "Corte y peinado",
  fecha: "viernes 20 de septiembre",
  hora: "10:30",
  enlace: "https://turnosrapidos.com.ar/mi-turno",
};

function vistaPrevia(texto: string, negocio: string) {
  const ejemplos: Record<string, string> = { ...ejemplosBase, negocio: negocio || "Tu negocio" };
  return texto.replace(/(?:\{|\()(nombre|negocio|servicio|fecha|hora|enlace)(?:\}|\))/g, (_, clave: string) => ejemplos[clave] ?? "");
}

function normalizarPlantilla(texto: string, negocio: string) {
  return texto
    .replace(/\{negocio\}|\(negocio\)/g, negocio || "Tu negocio")
    .replace(/\{(nombre|servicio|fecha|hora|enlace)\}/g, "($1)");
}

export function FormularioAvisos({
  inicial,
  nombreNegocio,
  proActivo,
}: {
  inicial: Configuracion;
  nombreNegocio: string;
  proActivo: boolean;
}) {
  const [asuntoConfirmacion, setAsuntoConfirmacion] = useState(normalizarPlantilla(inicial.emailAsuntoConfirmacion, nombreNegocio));
  const [textoConfirmacion, setTextoConfirmacion] = useState(normalizarPlantilla(inicial.emailTextoConfirmacion, nombreNegocio));
  const [asuntoRecordatorio, setAsuntoRecordatorio] = useState(normalizarPlantilla(inicial.emailAsuntoRecordatorio, nombreNegocio));
  const [textoRecordatorio, setTextoRecordatorio] = useState(normalizarPlantilla(inicial.emailTextoRecordatorio, nombreNegocio));
  const [vista, setVista] = useState<"confirmacion" | "recordatorio">("confirmacion");

  return (
    <form action={guardarConfiguracionAvisos} className="ajustes-campos avisos-formulario">
      <section className="avisos-bloque">
        <div className="avisos-bloque__encabezado">
          <div>
            <h3>Confirmación de turno</h3>
            <p>Se envía apenas el turno queda reservado.</p>
          </div>
          <label className="avisos-interruptor">
            <input type="checkbox" name="emailConfirmacionActivo" defaultChecked={inicial.emailConfirmacionActivo} />
            <span>Activar</span>
          </label>
        </div>
        <label><span>Asunto</span>
          <input name="emailAsuntoConfirmacion" maxLength={140} required value={asuntoConfirmacion} onChange={(evento) => setAsuntoConfirmacion(evento.target.value)} />
        </label>
        <label><span>Mensaje para tu cliente</span>
          <textarea name="emailTextoConfirmacion" rows={6} maxLength={1000} required value={textoConfirmacion} onChange={(evento) => setTextoConfirmacion(evento.target.value)} />
        </label>
      </section>

      <section className="avisos-bloque">
        <div className="avisos-bloque__encabezado">
          <div>
            <h3>Recordatorio</h3>
            <p>Ayudá a que nadie se olvide de su turno. Se envía 24 horas antes.</p>
          </div>
          <label className="avisos-interruptor">
            <input type="checkbox" name="emailRecordatorioActivo" defaultChecked={inicial.emailRecordatorioActivo} />
            <span>Activar</span>
          </label>
        </div>
        <label><span>Asunto</span>
          <input name="emailAsuntoRecordatorio" maxLength={140} required value={asuntoRecordatorio} onChange={(evento) => setAsuntoRecordatorio(evento.target.value)} />
        </label>
        <label><span>Mensaje para tu cliente</span>
          <textarea name="emailTextoRecordatorio" rows={6} maxLength={1000} required value={textoRecordatorio} onChange={(evento) => setTextoRecordatorio(evento.target.value)} />
        </label>
      </section>

      <section className="avisos-vista">
        <div className="avisos-vista__encabezado">
          <div>
            <h3>Así lo verá tu cliente</h3>
          </div>
          <select aria-label="Mensaje de la vista previa" value={vista} onChange={(evento) => setVista(evento.target.value as "confirmacion" | "recordatorio")}>
            <option value="confirmacion">Confirmación</option>
            <option value="recordatorio">Recordatorio</option>
          </select>
        </div>
        <div className="avisos-vista__correo">
          <small>Para: Ana · {nombreNegocio}</small>
          <strong>{vistaPrevia(vista === "confirmacion" ? asuntoConfirmacion : asuntoRecordatorio, nombreNegocio)}</strong>
          <p>{vistaPrevia(vista === "confirmacion" ? textoConfirmacion : textoRecordatorio, nombreNegocio)}</p>
        </div>
      </section>

      <section className="avisos-bloque avisos-whatsapp">
        <div className="avisos-bloque__encabezado">
          <div>
            <h3>WhatsApp</h3>
            <p>También podés enviar confirmaciones y recordatorios por WhatsApp.</p>
          </div>
          <span className="avisos-plan">PRO</span>
        </div>
        <div className="avisos-whatsapp__mensajes">
          <article>
            <label className="avisos-checkline"><input type="checkbox" name="whatsappConfirmacionActivo" defaultChecked={inicial.whatsappConfirmacionActivo} disabled={!proActivo} /> Confirmación por WhatsApp</label>
            <p>{vistaPrevia(textoConfirmacion, nombreNegocio)}</p>
          </article>
          <article>
            <label className="avisos-checkline"><input type="checkbox" name="whatsappRecordatorioActivo" defaultChecked={inicial.whatsappRecordatorioActivo} disabled={!proActivo} /> Recordatorio por WhatsApp · 24 horas antes</label>
            <p>{vistaPrevia(textoRecordatorio, nombreNegocio)}</p>
          </article>
        </div>
        <small>{proActivo ? "Las plantillas se enviarán según la configuración de tu cuenta." : "Esta opción estará disponible con el plan PRO y plantillas aprobadas."}</small>
      </section>

      <BotonEnvio pendiente="Guardando cambios…">Guardar cambios</BotonEnvio>
    </form>
  );
}
