/** Gestiona el registro y el inicio de sesión con email o Google. */
"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";

export function FormularioAcceso() {
  const parametros = useSearchParams();
  const router = useRouter();
  const registro = parametros.get("modo") !== "ingreso";
  const [verContrasena, setVerContrasena] = useState(false);
  const [verRepeticion, setVerRepeticion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const googleHabilitado =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_HABILITADO === "true";

  useEffect(() => {
    setMensaje("");
    setVerContrasena(false);
    setVerRepeticion(false);
  }, [registro]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");

    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get("nombre") ?? "").trim();
    const email = String(datos.get("email"));
    const password = String(datos.get("password"));
    const repetirPassword = String(datos.get("repetirPassword") ?? "");

    if (registro && nombre.length < 2) {
      setMensaje("Ingresá tu nombre para crear la cuenta.");
      return;
    }

    if (registro && password !== repetirPassword) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    const resultado = registro
      ? await clienteAutenticacion.signUp.email({
          name: nombre,
          email,
          password,
          callbackURL: "/primeros-pasos",
        })
      : await clienteAutenticacion.signIn.email({
          email,
          password,
          rememberMe: true,
          callbackURL: "/panel",
        });

    setCargando(false);
    if (resultado.error) {
      setMensaje(
        resultado.error.message ?? "No pudimos completar la operación.",
      );
      return;
    }

    if (registro) {
      setMensaje(
        "Te enviamos un enlace para verificar tu email. Revisá tu bandeja de entrada para continuar.",
      );
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  async function ingresarConGoogle() {
    setMensaje("");

    if (!googleHabilitado) {
      setMensaje(
        "Google estará disponible cuando configuremos sus credenciales.",
      );
      return;
    }

    await clienteAutenticacion.signIn.social({
      provider: "google",
      callbackURL: registro ? "/primeros-pasos" : "/panel",
    });
  }

  return (
    <main className="acceso">
      <Link className="acceso__logo" href="/" aria-label="Volver al inicio">
        <LogoTurnosRapidos />
      </Link>

      <section className="acceso__formulario" aria-labelledby="titulo-acceso">
        <div className="formulario-caja">
          <h1 id="titulo-acceso">
            {registro ? "Creá tu cuenta gratis" : "Qué bueno verte"}
          </h1>
          <p>
            {registro
              ? "Completá estos datos para empezar a configurar tu negocio."
              : "Ingresá para continuar administrando tus turnos."}
          </p>

          <form onSubmit={enviar}>
            <button
              className="google"
              type="button"
              onClick={ingresarConGoogle}
              aria-label="Continuar con Google"
              title="Continuar con Google"
            >
              <FcGoogle aria-hidden="true" />
            </button>

            <div className="separador">
              <span />o con tu email
              <span />
            </div>

            {registro && (
              <label>
                Nombre
                <input
                  required
                  minLength={2}
                  maxLength={60}
                  name="nombre"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Tu nombre"
                />
              </label>
            )}

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

            <label>
              Contraseña
              <div className="password">
                <input
                  required
                  minLength={8}
                  name="password"
                  type={verContrasena ? "text" : "password"}
                  autoComplete={registro ? "new-password" : "current-password"}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena(!verContrasena)}
                  aria-label={
                    verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {verContrasena ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            {registro && (
              <label>
                Repetir contraseña
                <div className="password">
                  <input
                    required
                    minLength={8}
                    name="repetirPassword"
                    type={verRepeticion ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Escribila nuevamente"
                  />
                  <button
                    type="button"
                    onClick={() => setVerRepeticion(!verRepeticion)}
                    aria-label={
                      verRepeticion
                        ? "Ocultar contraseña repetida"
                        : "Mostrar contraseña repetida"
                    }
                  >
                    {verRepeticion ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
            )}

            {!registro && (
              <Link href="/recuperar" className="olvido">
                ¿Olvidaste tu contraseña?
              </Link>
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
                : registro
                  ? "Crear mi cuenta"
                  : "Ingresar"}
            </button>
          </form>

          <p className="cambiar-modo">
            {registro ? "¿Ya tenés una cuenta?" : "¿Es tu primera vez?"}{" "}
            <Link href={registro ? "/acceder?modo=ingreso" : "/acceder"}>
              {registro ? "Ingresar" : "Crear una cuenta"}
            </Link>
          </p>

          <small className="terminos">
            Al continuar aceptás los Términos de uso y la Política de
            privacidad.
          </small>
        </div>
      </section>

      <small className="acceso__pie">© 2026 Turnos Rápidos</small>
    </main>
  );
}
