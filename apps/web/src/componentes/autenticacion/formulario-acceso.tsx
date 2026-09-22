/** Gestiona el registro y el inicio de sesión con email o Google. */
"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";
import { useCargaAplicacion } from "@/componentes/carga/proveedor-carga";

export function FormularioAcceso() {
  const parametros = useSearchParams();
  const router = useRouter();
  const { iniciarIngreso, cancelarIngreso } = useCargaAplicacion();
  const registro = parametros.get("modo") !== "ingreso";
  const [verContrasena, setVerContrasena] = useState(false);
  const [verRepeticion, setVerRepeticion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [emailVerificacion, setEmailVerificacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const googleHabilitado =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_HABILITADO === "true";

  useEffect(() => {
    setMensaje("");
    setEmailVerificacion("");
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
    if (!registro) iniciarIngreso();

    try {
      const resultado = registro
        ? await clienteAutenticacion.signUp.email({
            name: nombre,
            email,
            password,
            callbackURL: "/panel",
          })
        : await clienteAutenticacion.signIn.email({
            email,
            password,
            rememberMe: true,
          });

      setCargando(false);
      if (resultado.error) {
        if (!registro) cancelarIngreso();
        if (resultado.error.code === "EMAIL_NOT_VERIFIED") {
          setEmailVerificacion(email);
        }
        setMensaje(
          resultado.error.message ?? "No pudimos completar la operación.",
        );
        return;
      }

      if (registro) {
        setEmailVerificacion(email);
        setMensaje(
          "Te enviamos un enlace para verificar tu email. Revisá tu bandeja de entrada para continuar.",
        );
        return;
      }

      router.push("/panel");
    } catch {
      setCargando(false);
      cancelarIngreso();
      setMensaje(
        "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
      );
    }
  }

  async function ingresarConGoogle() {
    setMensaje("");

    if (!googleHabilitado) {
      setMensaje(
        "Google estará disponible cuando configuremos sus credenciales.",
      );
      return;
    }

    iniciarIngreso();
    try {
      const resultado = await clienteAutenticacion.signIn.social({
        provider: "google",
        callbackURL: "/panel",
      });
      if (resultado.error) {
        cancelarIngreso();
        setMensaje(
          resultado.error.message ?? "No pudimos ingresar con Google.",
        );
      }
    } catch {
      cancelarIngreso();
      setMensaje("No pudimos conectarnos con Google. Intentá de nuevo.");
    }
  }

  async function reenviarVerificacion() {
    setCargando(true);
    const resultado = await clienteAutenticacion.sendVerificationEmail({
      email: emailVerificacion,
      callbackURL: "/panel",
    });
    setCargando(false);

    if (resultado.error) {
      setMensaje(
        resultado.error.message ?? "No pudimos generar un enlace nuevo.",
      );
      return;
    }

    setMensaje(
      process.env.NODE_ENV === "development"
        ? "Generamos un enlace nuevo. Buscalo en la terminal debajo de [correo local]."
        : "Te enviamos un nuevo enlace de verificación.",
    );
  }

  return (
    <main
      className={`acceso acceso--fondo-7${registro ? "" : " acceso--ingreso"}`}
    >
      <Link className="acceso__logo" href="/" aria-label="Volver al inicio">
        <LogoTurnosRapidos />
      </Link>

      <div className="acceso__imagen-variante" aria-hidden="true">
        <Image
          src={
            registro
              ? "/acceso/ilustracion-agenda.png"
              : "/acceso/ilustracion-ingreso.png"
          }
          alt=""
          width={520}
          height={520}
          sizes="(max-width: 600px) 90vw, 42vw"
        />
      </div>

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
              <span>Continuar con Google</span>
            </button>

            <div className="separador">
              <span />o con tu email
              <span />
            </div>

            {registro && (
              <label className="campo-flotante">
                <span>Nombre</span>
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

            <label className="campo-flotante">
              <span>Email</span>
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vos@tunegocio.com"
              />
            </label>

            <label className="campo-flotante">
              <span>Contraseña</span>
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
              <label className="campo-flotante">
                <span>Repetir contraseña</span>
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

            {emailVerificacion && (
              <button
                className="reenviar-verificacion"
                type="button"
                disabled={cargando}
                onClick={reenviarVerificacion}
              >
                Generar otro enlace de verificación
              </button>
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
            Al continuar aceptás los{" "}
            <Link href="/terminos">Términos de uso</Link> y la{" "}
            <Link href="/privacidad">Política de privacidad</Link>.
          </small>
        </div>
      </section>

      <small className="acceso__pie">© 2026 Turnos Rápidos</small>
    </main>
  );
}
