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

const ejemplos: Record<string, string> = {
  nombre: "Ana",
  negocio: "Tu negocio",
  servicio: "Corte de cabello",
  fecha: "15 de septiembre",
  hora: "13:00",
  enlace: "https://turnosrapidos.com.ar/mi-turno",
};

function vistaPrevia(texto: string) {
  return texto.replace(/\{(nombre|negocio|servicio|fecha|hora|enlace)\}/g, (_, clave: string) => ejemplos[clave] ?? "");
}

export function FormularioAvisos({
  inicial,
  emailConfigurado,
  proActivo,
}: {
  inicial: Configuracion;
  emailConfigurado: boolean;
  proActivo: boolean;
}) {
  const [asuntoConfirmacion, setAsuntoConfirmacion] = useState(inicial.emailAsuntoConfirmacion);
  const [textoConfirmacion, setTextoConfirmacion] = useState(inicial.emailTextoConfirmacion);
  const [asuntoRecordatorio, setAsuntoRecordatorio] = useState(inicial.emailAsuntoRecordatorio);
  const [textoRecordatorio, setTextoRecordatorio] = useState(inicial.emailTextoRecordatorio);
  const [vista, setVista] = useState<"confirmacion" | "recordatorio">("confirmacion");

  return (
    <form action={guardarConfiguracionAvisos} className="ajustes-campos avisos-formulario">
      <p className="aviso-ajustes">
        {emailConfigurado
          ? "El correo está listo para enviar avisos."
          : "El correo todavía no está configurado. Podés preparar los mensajes, pero no se enviarán hasta que TurnosRápidos active el remitente."}
      </p>
      <div className="avisos-opciones">
        <label><input type="checkbox" name="emailConfirmacionActivo" defaultChecked={inicial.emailConfirmacionActivo} /> Enviar confirmación por email</label>
        <label><input type="checkbox" name="emailRecordatorioActivo" defaultChecked={inicial.emailRecordatorioActivo} /> Recordar el turno por email 24 horas antes</label>
      </div>
      <p className="ayuda-ajustes">Para personalizar, usá: {"{nombre}"}, {"{negocio}"}, {"{servicio}"}, {"{fecha}"}, {"{hora}"} o {"{enlace}"}.</p>
      <label>Asunto de confirmación
        <input name="emailAsuntoConfirmacion" maxLength={140} required value={asuntoConfirmacion} onChange={(evento) => setAsuntoConfirmacion(evento.target.value)} />
      </label>
      <label>Mensaje de confirmación
        <textarea name="emailTextoConfirmacion" rows={3} maxLength={1000} required value={textoConfirmacion} onChange={(evento) => setTextoConfirmacion(evento.target.value)} />
      </label>
      <label>Asunto del recordatorio
        <input name="emailAsuntoRecordatorio" maxLength={140} required value={asuntoRecordatorio} onChange={(evento) => setAsuntoRecordatorio(evento.target.value)} />
      </label>
      <label>Mensaje del recordatorio
        <textarea name="emailTextoRecordatorio" rows={3} maxLength={1000} required value={textoRecordatorio} onChange={(evento) => setTextoRecordatorio(evento.target.value)} />
      </label>
      <div className="avisos-vista">
        <label>Vista previa
          <select value={vista} onChange={(evento) => setVista(evento.target.value as "confirmacion" | "recordatorio")}>
            <option value="confirmacion">Confirmación</option>
            <option value="recordatorio">Recordatorio</option>
          </select>
        </label>
        <strong>{vistaPrevia(vista === "confirmacion" ? asuntoConfirmacion : asuntoRecordatorio)}</strong>
        <p>{vistaPrevia(vista === "confirmacion" ? textoConfirmacion : textoRecordatorio)}</p>
      </div>
      <div className="avisos-opciones">
        <strong>WhatsApp automático · PRO</strong>
        <p>El botón para contactar al negocio desde tu página sigue disponible en todos los planes. Los mensajes automáticos necesitan PRO y plantillas aprobadas.</p>
        <label><input type="checkbox" name="whatsappConfirmacionActivo" defaultChecked={inicial.whatsappConfirmacionActivo} disabled={!proActivo} /> Confirmación por WhatsApp</label>
        <label><input type="checkbox" name="whatsappRecordatorioActivo" defaultChecked={inicial.whatsappRecordatorioActivo} disabled={!proActivo} /> Recordatorio por WhatsApp 24 horas antes</label>
        {!proActivo && <small>PRO estará disponible cuando definamos su precio y cupo de mensajes.</small>}
      </div>
      <BotonEnvio pendiente="Guardando avisos…">Guardar mensajes</BotonEnvio>
    </form>
  );
}
