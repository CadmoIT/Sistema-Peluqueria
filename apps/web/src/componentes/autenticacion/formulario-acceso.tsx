/** Gestiona un acceso sencillo por email o Google y recupera los datos iniciados en la landing. */
"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import {
  CLAVE_REGISTRO_NEGOCIO,
  type RegistroNegocioInicial,
} from "@/lib/registro-inicial";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";

export function FormularioAcceso() {
  const parametros = useSearchParams();
  const router = useRouter();
  const [registro, setRegistro] = useState(
    parametros.get("modo") !== "ingreso",
  );
  const [verContrasena, setVerContrasena] = useState(false);
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [cantidadLocales, setCantidadLocales] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const googleHabilitado =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_HABILITADO === "true";

  useEffect(() => setMensaje(""), [registro]);

  function guardarDatosNegocio() {
    if (!registro) return true;

    if (!tipoNegocio || !cantidadLocales) {
      setMensaje("Elegí el tipo de negocio y la cantidad de locales.");
      return false;
    }

    const datosNegocio: RegistroNegocioInicial = {
      tipoNegocio,
      cantidadLocales,
    };
    sessionStorage.setItem(
      CLAVE_REGISTRO_NEGOCIO,
      JSON.stringify(datosNegocio),
    );
    return true;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    if (!guardarDatosNegocio()) return;
    setCargando(true);

    const datos = new FormData(evento.currentTarget);
    const email = String(datos.get("email"));
    const password = String(datos.get("password"));

    const resultado = registro
      ? await clienteAutenticacion.signUp.email({
          name: email.split("@")[0] || "Propietario",
          email,
          password,
          callbackURL: "/panel/configuracion",
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
    if (!guardarDatosNegocio()) return;

    if (!googleHabilitado) {
      setMensaje(
        "Google estará disponible cuando configuremos sus credenciales.",
      );
      return;
    }

    await clienteAutenticacion.signIn.social({
      provider: "google",
      callbackURL: registro ? "/panel/configuracion" : "/panel",
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
            {registro && (
              <>
                <label>
                  ¿Qué tipo de negocio tenés?
                  <select
                    name="tipoNegocio"
                    required
                    value={tipoNegocio}
                    onChange={(evento) => setTipoNegocio(evento.target.value)}
                  >
                    <option value="" disabled>
                      Elegí una opción
                    </option>
                    <option value="peluqueria">Peluquería</option>
                    <option value="barberia">Barbería</option>
                    <option value="unas">Uñas y manicuría</option>
                    <option value="estetica">Estética</option>
                    <option value="spa">Spa y bienestar</option>
                    <option value="otro">Otro negocio con turnos</option>
                  </select>
                </label>

                <label>
                  ¿Cuántos locales tenés?
                  <select
                    name="cantidadLocales"
                    required
                    value={cantidadLocales}
                    onChange={(evento) =>
                      setCantidadLocales(evento.target.value)
                    }
                  >
                    <option value="" disabled>
                      Seleccioná una cantidad
                    </option>
                    <option value="1">1 local</option>
                    <option value="2">2 locales</option>
                    <option value="3">3 locales</option>
                    <option value="4-5">Entre 4 y 5 locales</option>
                    <option value="6+">6 locales o más</option>
                  </select>
                </label>
              </>
            )}

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
            <button
              type="button"
              onClick={() => {
                setRegistro(!registro);
                setMensaje("");
              }}
            >
              {registro ? "Ingresar" : "Crear una cuenta"}
            </button>
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
