/** Recopila los tres datos necesarios para crear el primer negocio de la cuenta. */
"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  formatearPesos,
  PLANES,
  PLAN_GRATIS,
  PLAN_PRO,
} from "@turnos/config";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { CANTIDADES_LOCALES, RUBROS_NEGOCIO } from "@/lib/registro-inicial";
import { obtenerPerfilNegocio } from "@/lib/perfiles-negocio";

const planesDisponibles = [PLAN_GRATIS, ...PLANES, PLAN_PRO];

export function FormularioConfiguracionInicial({
  tipoNegocioInicial = "",
}: {
  tipoNegocioInicial?: string;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState(tipoNegocioInicial);
  const [planId, setPlanId] = useState(PLAN_GRATIS.id);
  const perfil = obtenerPerfilNegocio({ tipoNegocio });

  async function continuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje("");
    setGuardando(true);

    const formulario = new FormData(evento.currentTarget);
    const nombreNegocio = String(formulario.get("nombreNegocio") ?? "").trim();
    const tipoNegocio = String(formulario.get("tipoNegocio") ?? "");
    const cantidadLocales = Number(formulario.get("cantidadLocales"));
    const planId = String(formulario.get("planId") ?? "");

    try {
      const respuesta = await fetch("/api/configuracion-inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreNegocio, tipoNegocio, cantidadLocales, planId }),
      });
      const resultado = (await respuesta.json()) as {
        mensaje?: string;
        planId?: string;
      };

      if (!respuesta.ok) {
        setMensaje(resultado.mensaje ?? "No pudimos guardar estos datos.");
        return;
      }

      if (resultado.planId && resultado.planId !== PLAN_GRATIS.id) {
        const formularioPago = document.createElement("form");
        formularioPago.method = "post";
        formularioPago.action = `/api/v1/facturacion/suscripciones/checkout?plan=${encodeURIComponent(resultado.planId)}`;
        document.body.append(formularioPago);
        formularioPago.submit();
        return;
      }

      router.push("/panel/resumen");
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
            <select
              name="tipoNegocio"
              required
              value={tipoNegocio}
              onChange={(evento) => setTipoNegocio(evento.target.value)}
            >
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
              placeholder={`Por ejemplo, ${perfil.ejemploNegocio}`}
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

          <fieldset className="primeros-pasos__planes">
            <legend>Elegí el plan para tu negocio</legend>
            <div className="primeros-pasos__planes-opciones">
              {planesDisponibles.map((plan) => {
                const esGratis = plan.id === PLAN_GRATIS.id;
                const seleccionado = plan.id === planId;

                return (
                  <label
                    className={`primeros-pasos__plan${seleccionado ? " seleccionado" : ""}`}
                    key={plan.id}
                  >
                    <input
                      type="radio"
                      name="planId"
                      value={plan.id}
                      checked={seleccionado}
                      onChange={() => setPlanId(plan.id)}
                    />
                    <span className="primeros-pasos__plan-detalle">
                      <span className="primeros-pasos__plan-encabezado">
                        <strong>{plan.nombre}</strong>
                        <strong>
                          {esGratis
                            ? "7 días gratis"
                            : `${formatearPesos(plan.precioMensual ?? 0)} / mes`}
                        </strong>
                      </span>
                      <span>{plan.descripcion}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="primeros-pasos__planes-ayuda">
              Plus y Pro se activan al confirmar el pago en Mercado Pago. Tu
              elección queda asociada a este negocio.
            </p>
          </fieldset>

          {mensaje && (
            <p className="primeros-pasos__mensaje" role="status">
              {mensaje}
            </p>
          )}

          <button className="boton boton--primario" disabled={guardando}>
            {guardando
              ? planId === PLAN_GRATIS.id
                ? "Preparando tu espacio..."
                : "Preparando el pago..."
              : planId === PLAN_GRATIS.id
                ? "Crear mi negocio"
                : "Crear negocio y continuar al pago"}
            {!guardando && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </section>
    </main>
  );
}
