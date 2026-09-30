/** Presenta el flujo accesible de solicitud, validación y cambio de contraseña. */
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";

type PasoRecuperacion = "email" | "codigo" | "contrasena";

type RespuestaRecuperacion = {
  mensaje?: string;
  reintentarEn?: number;
  ok?: boolean;
};

async function solicitarApi(ruta: string, cuerpo: Record<string, string>) {
  const respuesta = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(cuerpo),
  });
  const datos = (await respuesta
    .json()
    .catch(() => ({}))) as RespuestaRecuperacion;
  return { respuesta, datos };
}

export function FormularioRecuperacion() {
  const [paso, setPaso] = useState<PasoRecuperacion>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (segundos <= 0) return;
    const intervalo = window.setInterval(() => {
      setSegundos((actual) => Math.max(0, actual - 1));
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [segundos]);

  async function solicitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setMensaje("");
    setEsError(false);
    const formData = new FormData(evento.currentTarget);
    const emailIngresado = String(formData.get("email") ?? "").trim();
    try {
      const { respuesta, datos } = await solicitarApi(
        "/api/recuperacion/solicitar",
        { email: emailIngresado },
      );
      if (!respuesta.ok) {
        setEsError(true);
        setMensaje(datos.mensaje ?? "No pudimos iniciar la recuperación.");
        return;
      }
      setEmail(emailIngresado);
      setPaso("codigo");
      setCodigo("");
      setSegundos(datos.reintentarEn ?? 60);
      setMensaje(
        datos.mensaje ??
          "Si el email está registrado, vas a recibir un código.",
      );
    } catch {
      setEsError(true);
      setMensaje("No pudimos conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function verificar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (codigo.length !== 6) return;
    setCargando(true);
    setMensaje("");
    setEsError(false);
    try {
      const { respuesta, datos } = await solicitarApi(
        "/api/recuperacion/verificar",
        { email, codigo },
      );
      if (!respuesta.ok || !datos.ok) {
        setEsError(true);
        setMensaje(datos.mensaje ?? "El código no es válido o venció.");
        return;
      }
      setPaso("contrasena");
      setMensaje("");
    } catch {
      setEsError(true);
      setMensaje("No pudimos verificar el código. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    setCargando(true);
    setMensaje("");
    setEsError(false);
    try {
      const { respuesta, datos } = await solicitarApi(
        "/api/recuperacion/reenviar",
        { email },
      );
      if (!respuesta.ok) {
        setEsError(true);
        setMensaje(datos.mensaje ?? "No pudimos reenviar el código.");
        return;
      }
      setSegundos(datos.reintentarEn ?? 60);
      setMensaje(
        datos.mensaje ?? "Si el email está registrado, enviamos el código.",
      );
    } catch {
      setEsError(true);
      setMensaje("No pudimos conectar. Intentá reenviar en unos segundos.");
    } finally {
      setCargando(false);
    }
  }

  async function guardarContrasena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setMensaje("");
    setEsError(false);
    const formData = new FormData(evento.currentTarget);
    const contrasena = String(formData.get("contrasena") ?? "");
    const confirmacion = String(formData.get("confirmacion") ?? "");
    if (contrasena !== confirmacion) {
      setEsError(true);
      setMensaje("Las contraseñas no coinciden.");
      setCargando(false);
      return;
    }
    try {
      const { respuesta, datos } = await solicitarApi(
        "/api/recuperacion/contrasena",
        { contrasena, confirmacion },
      );
      if (!respuesta.ok || !datos.ok) {
        setEsError(true);
        setMensaje(datos.mensaje ?? "No pudimos cambiar la contraseña.");
        return;
      }
      setMensaje("Tu contraseña fue actualizada. Ya podés ingresar.");
      setPaso("email");
      setCodigo("");
      setSegundos(0);
    } catch {
      setEsError(true);
      setMensaje(
        "No pudimos conectar. Intentá guardar la contraseña de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  }

  const titulo =
    paso === "email"
      ? "Recuperá tu acceso"
      : paso === "codigo"
        ? "Ingresá tu código"
        : "Elegí una contraseña nueva";

  return (
    <main className="recuperar">
      <div className="formulario-caja recuperar__caja">
        <Link href="/" aria-label="Volver al inicio">
          <LogoTurnosRapidos />
        </Link>
        <span className="recuperar__sobrelinea">CUENTA SEGURA</span>
        <h1>{titulo}</h1>
        <p>
          {paso === "email"
            ? "Te enviaremos un código de seis dígitos a tu email."
            : paso === "codigo"
              ? `Ingresá el código que enviamos a ${email}. Vence a los 10 minutos.`
              : "Usá una contraseña segura de entre 8 y 128 caracteres."}
        </p>

        {paso === "email" && (
          <form onSubmit={solicitar}>
            <label>
              Email
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vos@tunegocio.com"
                maxLength={254}
              />
            </label>
            {mensaje && (
              <p
                className={
                  esError
                    ? "mensaje-acceso mensaje-acceso--error"
                    : "mensaje-acceso"
                }
                role={esError ? "alert" : "status"}
              >
                {mensaje}
              </p>
            )}
            <button
              className="boton boton--primario enviar-acceso"
              disabled={cargando}
            >
              {cargando ? "Enviando…" : "Enviar código"}
            </button>
          </form>
        )}

        {paso === "codigo" && (
          <form onSubmit={verificar}>
            <label
              className="recuperar__etiqueta-codigo"
              htmlFor="codigo-recuperacion"
            >
              Código de seis dígitos
            </label>
            <div className="recuperar__codigo">
              <div className="recuperar__casillas" aria-hidden="true">
                {Array.from({ length: 6 }, (_, indice) => (
                  <span key={indice}>{codigo[indice] ?? ""}</span>
                ))}
              </div>
              <input
                id="codigo-recuperacion"
                className="recuperar__entrada-codigo"
                aria-label="Código de recuperación de seis dígitos"
                aria-describedby="ayuda-codigo"
                name="codigo"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={codigo}
                onChange={(evento) =>
                  setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
                required
              />
            </div>
            <span id="ayuda-codigo" className="recuperar__ayuda-codigo">
              También podés pegar el código completo.
            </span>
            {mensaje && (
              <p
                className={
                  esError
                    ? "mensaje-acceso mensaje-acceso--error"
                    : "mensaje-acceso"
                }
                role={esError ? "alert" : "status"}
              >
                {mensaje}
              </p>
            )}
            <button
              className="boton boton--primario enviar-acceso"
              disabled={cargando || codigo.length !== 6}
            >
              {cargando ? "Verificando…" : "Verificar código"}
            </button>
            <button
              className="reenviar-verificacion"
              type="button"
              onClick={reenviar}
              disabled={cargando || segundos > 0}
            >
              {segundos > 0
                ? `Podés reenviar en ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`
                : "Reenviar código"}
            </button>
            <button
              className="recuperar__cambiar-email"
              type="button"
              onClick={() => {
                setPaso("email");
                setMensaje("");
                setCodigo("");
              }}
            >
              Usar otro email
            </button>
          </form>
        )}

        {paso === "contrasena" && (
          <form onSubmit={guardarContrasena}>
            <label>
              Nueva contraseña
              <input
                required
                minLength={8}
                maxLength={128}
                name="contrasena"
                type="password"
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                required
                minLength={8}
                maxLength={128}
                name="confirmacion"
                type="password"
                autoComplete="new-password"
              />
            </label>
            {mensaje && (
              <p
                className={
                  esError
                    ? "mensaje-acceso mensaje-acceso--error"
                    : "mensaje-acceso"
                }
                role={esError ? "alert" : "status"}
              >
                {mensaje}
              </p>
            )}
            <button
              className="boton boton--primario enviar-acceso"
              disabled={cargando}
            >
              {cargando ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        )}

        <Link className="volver-acceso" href="/acceder">
          Volver a ingresar
        </Link>
      </div>
    </main>
  );
}
