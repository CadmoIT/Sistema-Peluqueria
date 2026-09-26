/** Permite consultar y contratar los planes disponibles para el negocio. */
import { Check, CreditCard } from "lucide-react";
import {
  formatearPesos,
  nombrePlan,
  PLANES,
  PLAN_GRATIS,
  PLAN_PRO,
} from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";

export const metadata = { title: "Planes" };

export default async function PaginaPlanes() {
  const { negocio } = await obtenerFacturacion();
  const suscripcion = negocio.suscripcion;
  const planes = [PLAN_GRATIS, ...PLANES, PLAN_PRO];
  const planActual = suscripcion?.plan ?? PLAN_GRATIS.id;

  return (
    <div className="panel-contenido facturacion-pantalla">
      <VistaPanelLista ruta="/panel/planes" />
      <header className="cabecera-seccion facturacion-cabecera">
        <h1>Planes</h1>
      </header>
      <section
        className="planes-grid planes-grid--panel"
        aria-label="Planes disponibles"
      >
        {planes.map((plan) => {
          const esActual = plan.id === planActual;
          return (
            <article
              key={plan.id}
              className={`plan-card plan-card--${plan.id.toLowerCase()}${plan.destacado ? " destacado" : ""}${esActual ? " actual" : ""}`}
            >
              {esActual && <span className="recomendado">PLAN ACTUAL</span>}
              {plan.destacado && !esActual && (
                <span className="recomendado">MÁS ELEGIDO</span>
              )}
              <h2>{plan.nombre}</h2>
              <p>{plan.descripcion}</p>
              <div className={`precio precio--${plan.id.toLowerCase()}`}>
                <strong>
                  {plan.precioMensual === 0
                    ? "Gratis"
                    : plan.precioMensual === null
                      ? "A definir"
                      : formatearPesos(plan.precioMensual)}
                </strong>
                {plan.precioMensual !== null && plan.precioMensual !== 0 && (
                  <span className="precio__moneda">ARS / mes</span>
                )}
              </div>
              <ul>
                <li>
                  <Check aria-hidden="true" />
                  {plan.id === "PRUEBA"
                    ? "1 negocio"
                    : plan.id === "pro"
                      ? "Negocios ilimitados"
                      : "2 negocios"}
                </li>
                {plan.beneficios.map((beneficio) => (
                  <li key={beneficio}>
                    <Check aria-hidden="true" />
                    {beneficio}
                  </li>
                ))}
              </ul>
              {esActual ? (
                <button className="boton boton--secundario" disabled>
                  Plan actual · {nombrePlan(planActual)}
                </button>
              ) : plan.id === "PRUEBA" ? (
                <button className="boton boton--secundario" disabled>
                  Plan gratuito
                </button>
              ) : (
                <form
                  method="post"
                  action={`/api/v1/facturacion/suscripciones/checkout?plan=${encodeURIComponent(plan.id)}`}
                >
                  <button className="boton boton--primario" type="submit">
                    <CreditCard aria-hidden="true" /> Cambiar a{" "}
                    {plan.nombre === "PRO" ? "Pro" : plan.nombre}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
