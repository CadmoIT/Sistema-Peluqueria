/** Permite solicitar el correo de recuperación y establecer una contraseña nueva. */
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";

export function FormularioRecuperacion() {
  const params = useSearchParams();
  const token = params.get("token");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setMensaje("");
    const datos = new FormData(evento.currentTarget);

    const resultado = token
      ? await clienteAutenticacion.resetPassword({
          token,
          newPassword: String(datos.get("password")),
        })
      : await clienteAutenticacion.requestPasswordReset({
          email: String(datos.get("email")),
          redirectTo: "/recuperar",
        });

    setCargando(false);
    setMensaje(
      resultado.error
        ? (resultado.error.message ?? "No pudimos completar la operación.")
        : token
          ? "Tu contraseña fue actualizada. Ya podés ingresar."
          : "Si el email está registrado, vas a recibir un enlace en unos minutos.",
    );
  }

  return (
    <main className="recuperar">
      <div className="formulario-caja recuperar__caja">
        <Link href="/">
          <LogoTurnosRapidos />
        </Link>
        <span className="recuperar__sobrelinea">CUENTA SEGURA</span>
        <h1>{token ? "Elegí una contraseña nueva" : "Recuperá tu acceso"}</h1>
        <p>
          {token
            ? "Usá al menos ocho caracteres."
            : "Te enviaremos un enlace seguro a tu email."}
        </p>
        <form onSubmit={enviar}>
          {token ? (
            <label>
              Nueva contraseña
              <input
                required
                minLength={8}
                name="password"
                type="password"
                autoComplete="new-password"
              />
            </label>
          ) : (
            <label>
              Email
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vos@tunegocio.com"
              />
            </label>
          )}
          {mensaje && (
            <p className="mensaje-acceso" role="status">
              {mensaje}
            </p>
          )}
          <button
            className="boton boton--primario enviar-acceso"
            disabled={cargando}
          >
            {cargando
              ? "Procesando..."
              : token
                ? "Guardar contraseña"
                : "Enviar enlace"}
          </button>
        </form>
        <Link className="volver-acceso" href="/acceder">
          Volver a ingresar
        </Link>
      </div>
    </main>
  );
}
