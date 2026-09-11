/** Recopila los tres datos necesarios para crear el primer negocio de la cuenta. */
"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { CANTIDADES_LOCALES, RUBROS_NEGOCIO } from "@/lib/registro-inicial";

export function FormularioConfiguracionInicial() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setGuardando(true);

    const formulario = new FormData(evento.currentTarget);
    const nombreNegocio = String(formulario.get("nombreNegocio") ?? "").trim();
    const tipoNegocio = String(formulario.get("tipoNegocio") ?? "");
    const cantidadLocales = Number(formulario.get("cantidadLocales"));

    try {
      const respuesta = await fetch("/api/configuracion-inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreNegocio, tipoNegocio, cantidadLocales }),
      });
      const resultado = (await respuesta.json()) as { mensaje?: string };

      if (!respuesta.ok) {
        setMensaje(resultado.mensaje ?? "No pudimos guardar estos datos.");
        return;
      }

      router.push("/panel");
      router.refresh();
    } catch {
      setMensaje("No pudimos conectarnos. Intentá nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="primeros-pasos">
      <header className="primeros-pasos__marca">
        <LogoTurnosRapidos />
      </header>

      <section className="primeros-pasos__contenido">
        <div className="primeros-pasos__introduccion">
          <span>PRIMEROS PASOS</span>
          <h1>Contanos sobre tu negocio</h1>
          <p>
            Con estos datos preparamos tu espacio de trabajo. Después vas a
            poder personalizar cada detalle.
          </p>
        </div>

        <form className="primeros-pasos__formulario" onSubmit={continuar}>
          <label className="texto-pregunta">
            ¿Qué tipo de negocio tenés?
            <select name="tipoNegocio" required defaultValue="">
              <option value="" disabled>
                Elegí una opción
              </option>
              {RUBROS_NEGOCIO.map((rubro) => (
                <option key={rubro.valor} value={rubro.valor}>
                  {rubro.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nombre del negocio
            <input
              name="nombreNegocio"
              type="text"
              minLength={2}
              maxLength={80}
              placeholder="Por ejemplo, Estudio Abril"
              autoComplete="organization"
              required
            />
          </label>

          <label className="texto-pregunta">
            ¿Cuántos locales tenés?
            <select name="cantidadLocales" required defaultValue="">
              <option value="" disabled>
                Seleccioná una cantidad
              </option>
              {CANTIDADES_LOCALES.map((cantidad) => (
                <option key={cantidad.valor} value={cantidad.valor}>
                  {cantidad.nombre}
                </option>
              ))}
            </select>
          </label>

          {mensaje && (
            <p className="primeros-pasos__mensaje" role="status">
              {mensaje}
            </p>
          )}

          <button className="boton boton--primario" disabled={guardando}>
            {guardando ? "Preparando tu espacio..." : "Crear mi negocio"}
            {!guardando && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </section>
    </main>
  );
}
