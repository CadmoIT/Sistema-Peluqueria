/** Crea turnos con estado de envío y errores claros sin abandonar la fecha elegida. */
"use client";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { crearReservaPanel } from "@/app/panel/agenda/acciones";
import { BotonEnvio } from "@/componentes/panel/boton-envio";

export function FormularioTurno({
  datos,
}: {
  datos: {
    fecha: string;
    sedes: Array<{ id: string; nombre: string }>;
    profesionales: Array<{
      id: string;
      nombre: string;
      apellido: string | null;
    }>;
    servicios: Array<{ id: string; nombre: string }>;
    clientes: Array<{
      id: string;
      nombre: string | null;
      apellido: string | null;
      email: string | null;
      telefono: string | null;
    }>;
  };
}) {
  const [clienteId, setClienteId] = useState("");
  const [resultado, enviar] = useActionState(crearReservaPanel, {
    ok: true,
    mensaje: "",
  });
  useEffect(() => {
    if (!resultado.ok) toast.error(resultado.mensaje);
  }, [resultado]);
  return (
    <form action={enviar} className="formulario-flotante formulario-turno">
      <input type="hidden" name="fechaAgenda" value={datos.fecha} />
      <h2>
        <CalendarPlus /> Nuevo turno
      </h2>
      <label>
        Fecha y hora
        <input
          name="inicio"
          type="datetime-local"
          defaultValue={`${datos.fecha}T09:00`}
          required
        />
      </label>
      {datos.sedes.length === 1 ? (
        <input type="hidden" name="sedeId" value={datos.sedes[0]!.id} />
      ) : (
        <label>
          Local
          <select name="sedeId" required>
            {datos.sedes.map((sede) => (
              <option value={sede.id} key={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {datos.profesionales.length === 1 ? (
        <input
          type="hidden"
          name="profesionalId"
          value={datos.profesionales[0]!.id}
        />
      ) : (
        <label>
          Profesional
          <select name="profesionalId" required>
            {datos.profesionales.map((profesional) => (
              <option value={profesional.id} key={profesional.id}>
                {profesional.nombre} {profesional.apellido}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Servicio
        <select name="servicioId" required>
          {datos.servicios.map((servicio) => (
            <option value={servicio.id} key={servicio.id}>
              {servicio.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cliente
        <select
          name="clienteId"
          value={clienteId}
          onChange={(evento) => setClienteId(evento.target.value)}
        >
          <option value="">Nuevo cliente</option>
          {datos.clientes.map((cliente) => (
            <option value={cliente.id} key={cliente.id}>
              {nombreCliente(cliente)}
            </option>
          ))}
        </select>
      </label>
      {!clienteId && (
        <label>
          Nombre del cliente
          <input name="clienteNombre" />
        </label>
      )}
      {!resultado.ok && <p role="alert">{resultado.mensaje}</p>}
      <BotonEnvio pendiente="Guardando turno…">Guardar turno</BotonEnvio>
    </form>
  );
}
function nombreCliente(cliente: {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
}) {
  return (
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.email ||
    cliente.telefono ||
    "Cliente sin datos"
  );
}
