/** Muestra planes, estado de suscripción e historial de pagos del negocio. */
import {
  CircleAlert,
  CircleCheck,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { formatearPesos, nombrePlan, PLANES, PLAN_GRATIS, PLAN_PRO } from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";

export const metadata = { title: "Pagos y Facturación" };

export default async function PaginaFacturacion() {
  const { negocio, pagos } = await obtenerFacturacion();
  const suscripcion = negocio.suscripcion;
  const mercadoPagoDisponible = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Pagos y Facturación</h1>
          <p>Revisá tu plan y los cobros de TurnosRápidos.</p>
        </div>
      </header>
      <section className="estado-plan">
        <div>
          {suscripcion?.estado === "ACTIVA" ? <CircleCheck /> : <CircleAlert />}
          <span>
            <small>ESTADO ACTUAL</small>
            <strong>
              {suscripcion?.estado === "ACTIVA"
                ? `Plan activo · ${nombrePlan(suscripcion.plan)}`
                : suscripcion?.estado === "EN_GRACIA"
                  ? "Pago pendiente"
                  : "Plan Gratis · período de prueba"}
            </strong>
          </span>
        </div>
        <p>{detalleSuscripcion(suscripcion)}</p>
      </section>
      {!mercadoPagoDisponible && (
        <aside className="aviso-integracion">
          <CircleAlert />
          <div>
            <strong>Mercado Pago todavía no está configurado</strong>
            <p>
              Los planes se pueden revisar, pero el checkout se habilitará
              cuando se agregue la credencial del entorno.
            </p>
          </div>
        </aside>
      )}
      <section className="planes-panel" aria-label="Planes disponibles">
        {[PLAN_GRATIS, ...PLANES, PLAN_PRO].map((plan) => (
          <article
            key={plan.id}
            className={suscripcion?.plan === plan.id ? "actual" : ""}
          >
            <small>
              {suscripcion?.plan === plan.id ? "TU PLAN" : "PLAN MENSUAL"}
            </small>
            <h2>{plan.nombre}</h2>
            <p>{plan.descripcion}</p>
            <strong>
              {plan.precioMensual === null ? "Precio a definir" : formatearPesos(plan.precioMensual)}
              {plan.precioMensual !== null && plan.id !== "PRUEBA" && <span>/mes</span>}
            </strong>
            <ul>
              {plan.beneficios.map((beneficio) => (
                <li key={beneficio}>{beneficio}</li>
              ))}
            </ul>
            {plan.id === "PRUEBA" ? (
              <button className="boton boton--secundario" disabled>
                {suscripcion?.estado === "CONFIGURACION_GRATUITA" ? "Prueba en curso" : "Prueba de siete días"}
              </button>
            ) : plan.id === "pro" ? (
              <button className="boton boton--secundario" disabled>Próximamente</button>
            ) : suscripcion?.estado === "ACTIVA" || suscripcion?.proveedorId ? (
              <button className="boton boton--secundario" disabled>
                {suscripcion.estado === "ACTIVA"
                  ? "Plan en curso"
                  : "Pago iniciado"}
              </button>
            ) : mercadoPagoDisponible ? (
              <a
                className="boton boton--primario"
                href={
                  "/api/v1/facturacion/suscripciones/checkout?plan=" + plan.id
                }
              >
                <CreditCard /> Elegir plan
              </a>
            ) : (
              <button className="boton boton--secundario" disabled>
                Checkout no disponible
              </button>
            )}
          </article>
        ))}
      </section>
      <section className="historial-pagos">
        <header>
          <ReceiptText />
          <div>
            <h2>Historial de pagos</h2>
            <p>Importes cobrados y su estado.</p>
          </div>
        </header>
        {pagos.length ? (
          <div className="tabla-pagos">
            {pagos.map((pago) => (
              <div key={pago.id}>
                <span>{fecha(pago.creadoEn)}</span>
                <span>
                  {pago.proveedor === "mercadopago"
                    ? "Mercado Pago"
                    : pago.proveedor === "demo"
                      ? "Pago ficticio · Demo"
                      : pago.proveedor}
                </span>
                <strong>{formatearPesos(Number(pago.monto))}</strong>
                <b className={"estado estado--" + pago.estado.toLowerCase()}>
                  {pago.estado.replaceAll("_", " ")}
                </b>
              </div>
            ))}
          </div>
        ) : (
          <p className="aviso-ajustes">Todavía no hay pagos registrados.</p>
        )}
      </section>
    </div>
  );
}

function detalleSuscripcion(
  suscripcion: {
    pruebaFinalizaEn: Date | null;
    proximoCobro: Date | null;
    estado: string;
  } | null,
) {
  if (suscripcion?.estado === "ACTIVA" && suscripcion.proximoCobro) {
    return "Próximo cobro: " + fecha(suscripcion.proximoCobro) + ".";
  }
  if (suscripcion?.pruebaFinalizaEn) {
    return "La prueba finaliza el " + fecha(suscripcion.pruebaFinalizaEn) + ".";
  }
  return "Podés configurar todo antes de elegir un plan.";
}

function fecha(valor: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    valor,
  );
}
