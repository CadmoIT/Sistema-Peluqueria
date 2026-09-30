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

export default async function PaginaPlanes({
  searchParams,
}: {
  searchParams: Promise<{ facturacion?: string }>;
}) {
  const [{ negocio }, parametros] = await Promise.all([
    obtenerFacturacion(),
    searchParams,
  ]);
  const suscripcion = negocio.suscripcion;
  const planes = [PLAN_GRATIS, ...PLANES, PLAN_PRO];
  const planActual = suscripcion?.plan ?? PLAN_GRATIS.id;
  const aviso = mensajeFacturacion(parametros.facturacion) ?? (suscripcion?.planPendiente
    ? `Estamos verificando el cambio a ${nombrePlan(suscripcion.planPendiente)}. Tu plan actual se mantiene hasta confirmar el primer pago.`
    : null);

  return (
    <div className="panel-contenido facturacion-pantalla">
      <VistaPanelLista ruta="/panel/planes" />
      <header className="cabecera-seccion facturacion-cabecera">
        <h1>Planes</h1>
      </header>
      {aviso && <p className="facturacion-aviso" role="status">{aviso}</p>}
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

function mensajeFacturacion(estado?: string) {
  switch (estado) {
    case "retorno":
      return "Volviste de Mercado Pago. Estamos verificando el pago; el plan se actualizará cuando Mercado Pago lo confirme.";
    case "error":
      return "No pudimos iniciar el checkout. No se realizó ningún cambio en tu plan; podés volver a intentarlo.";
    case "no-configurada":
      return "La contratación todavía no está habilitada. Contactá al equipo de TurnosRápidos.";
    case "plan-invalido":
      return "El plan seleccionado no está disponible.";
    case "plan-actual":
      return "Ese ya es el plan activo de tu negocio.";
    case "cancelacion-en-curso":
      return "La renovación de tu plan ya está cancelada. Podrás contratar otro plan cuando termine el período vigente.";
    default:
      return null;
  }
}
