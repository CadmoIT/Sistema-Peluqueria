/** Permite consultar y contratar los planes disponibles para el negocio. */
import { Check, CreditCard } from "lucide-react";
import {
  formatearPesos,
  nombrePlan,
  PLANES,
  PLAN_GRATIS,
  PLAN_PRO,
  tieneAccesoOperativo,
} from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { ConfirmacionPago } from "@/componentes/panel/confirmacion-pago";

export const metadata = { title: "Planes" };

export default async function PaginaPlanes({
  searchParams,
}: {
  searchParams: Promise<{ facturacion?: string; acceso?: string }>;
}) {
  const [{ negocio }, parametros] = await Promise.all([
    obtenerFacturacion(),
    searchParams,
  ]);
  const suscripcion = negocio.suscripcion;
  const planes = [PLAN_GRATIS, ...PLANES, PLAN_PRO];
  const planActual = suscripcion?.plan ?? PLAN_GRATIS.id;
  const esperandoPago = Boolean(suscripcion?.planPendiente) &&
    (!parametros.facturacion || parametros.facturacion === "retorno");
  const aviso = esperandoPago
    ? `Pago en verificación. Estamos confirmando el cambio a ${nombrePlan(suscripcion!.planPendiente!)}. Esta pantalla se actualizará automáticamente; tu plan actual se mantiene hasta confirmar el pago.`
    : parametros.facturacion === "retorno" && suscripcion?.estado === "ACTIVA" && suscripcion.proveedorId
      ? `Tu plan ${nombrePlan(planActual)} está activo.`
      : mensajeFacturacion(parametros.facturacion);

  return (
    <div className="panel-contenido facturacion-pantalla">
      <VistaPanelLista ruta="/panel/planes" />
      <header className="cabecera-seccion facturacion-cabecera">
        <h1>Planes</h1>
      </header>
      {parametros.acceso === "solo-lectura" && <p className="facturacion-aviso" role="status">Tu panel está en modo de solo lectura. Elegí Plus o Pro para volver a trabajar con todas las herramientas; tus datos se conservan.</p>}
      {aviso && (esperandoPago
        ? <ConfirmacionPago mensaje={aviso} />
        : <p className="facturacion-aviso" role="status">{aviso}</p>)}
      <section
        className="planes-grid planes-grid--panel"
        aria-label="Planes disponibles"
      >
        {planes.map((plan) => {
          const esActual = plan.id === planActual && tieneAccesoOperativo(suscripcion);
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
