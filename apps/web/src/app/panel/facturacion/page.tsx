/** Muestra planes, estado de suscripción e historial de pagos del negocio. */
import {
  CircleAlert,
  CircleCheck,
  CreditCard,
  Check,
  ReceiptText,
} from "lucide-react";
import {
  formatearPesos,
  nombrePlan,
  PLANES,
  PLAN_GRATIS,
  PLAN_PRO,
} from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";

export const metadata = { title: "Pagos y Facturación" };

export default async function PaginaFacturacion() {
  const { negocio, pagos } = await obtenerFacturacion();
  const suscripcion = negocio.suscripcion;
  const mercadoPagoDisponible = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

  return (
    <div className="panel-contenido facturacion-pantalla">
      <VistaPanelLista ruta="/panel/facturacion" />
      <header className="cabecera-seccion facturacion-cabecera">
        <div>
          <span className="facturacion-sobrelinea">PLANES Y PAGOS</span>
          <h1>Pagos y Facturación</h1>
          <p>Elegí el plan que mejor acompaña a tu negocio y revisá tus pagos en un solo lugar.</p>
        </div>
      </header>
      <section className="estado-plan facturacion-resumen">
        <div>
          {suscripcion?.estado === "ACTIVA" ? <CircleCheck /> : <CircleAlert />}
          <span>
            <small>TU PLAN ACTUAL</small>
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
      <section className="planes-grid planes-grid--panel" aria-label="Planes disponibles">
        {[PLAN_GRATIS, ...PLANES, PLAN_PRO].map((plan) => (
          <article
            key={plan.id}
            className={`plan-card plan-card--${plan.id.toLowerCase()}${plan.destacado ? " destacado" : ""}${suscripcion?.plan === plan.id ? " actual" : ""}`}
          >
            {plan.destacado && <span className="recomendado">MÁS ELEGIDO</span>}
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
                <span className="precio__moneda">ARS</span>
              )}
            </div>
            <ul>
              {plan.beneficios.map((beneficio) => (
                <li key={beneficio}><Check aria-hidden="true" />{beneficio}</li>
              ))}
            </ul>
            {plan.id === "PRUEBA" ? (
              <button className="boton boton--secundario" disabled>
                {suscripcion?.estado === "CONFIGURACION_GRATUITA"
                  ? "Prueba en curso"
                  : "Prueba de siete días"}
              </button>
            ) : plan.id === "pro" ? (
              <button className="boton boton--secundario" disabled>
                Próximamente
              </button>
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
