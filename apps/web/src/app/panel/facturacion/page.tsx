/** Muestra el estado de cobro y la información de facturación del negocio. */
import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { formatearPesos, nombrePlan } from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { BotonCancelarPlan } from "@/componentes/panel/boton-cancelar-plan";

export const metadata = { title: "Facturación" };

export default async function PaginaFacturacion() {
  const { negocio, usuario, pagos, sede } = await obtenerFacturacion();
  const suscripcion = negocio.suscripcion;
  const planPagado = Boolean(suscripcion?.proveedorId);

  return (
    <div className="panel-contenido facturacion-pantalla facturacion-detalle">
      <VistaPanelLista ruta="/panel/facturacion" />
      <header className="cabecera-seccion facturacion-cabecera">
        <h1>Facturación</h1>
      </header>

      <section className="facturacion-bloque facturacion-plan-actual">
        <div>
          <h2>{nombrePlan(suscripcion?.plan)}</h2>
          <p>
            {suscripcion?.estado === "ACTIVA" && suscripcion.proximoCobro
              ? `Tu plan se renueva automáticamente el ${fecha(suscripcion.proximoCobro)}.`
              : suscripcion?.pruebaFinalizaEn
                ? `La prueba finaliza el ${fecha(suscripcion.pruebaFinalizaEn)}.`
                : "Plan gratuito"}
          </p>
        </div>
        <Link className="boton boton--secundario" href="/panel/planes">
          Cambiar plan
        </Link>
      </section>

      <section className="facturacion-bloque facturacion-transacciones">
        <header>
          <ReceiptText aria-hidden="true" />
          <h2>Historial de transacciones</h2>
        </header>
        {pagos.length ? (
          <div className="facturacion-filas">
            {pagos.map((pago) => (
              <div className="facturacion-fila" key={pago.id}>
                <span>{nombrePlan(suscripcion?.plan)}</span>
                <time dateTime={pago.creadoEn.toISOString()}>
                  {fecha(pago.creadoEn)}
                </time>
                <span className="facturacion-estado">
                  {pago.estado.replaceAll("_", " ")}
                </span>
                <strong>{formatearPesos(Number(pago.monto))}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="facturacion-vacio">
            Todavía no hay transacciones registradas.
          </p>
        )}
      </section>

      <section className="facturacion-bloque">
        <header>
          <h2>Información de facturación</h2>
        </header>
        <dl className="facturacion-datos">
          <div>
            <dt>Correo electrónico de facturación</dt>
            <dd>{usuario.email}</dd>
          </div>
          <div>
            <dt>Nombre</dt>
            <dd>{negocio.nombre}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>
              {sede?.direccion || "Todavía no se configuró una dirección."}
            </dd>
          </div>
        </dl>
        <Link
          className="facturacion-enlace"
          href="/panel/configuracion/negocio"
        >
          Editar información del negocio
        </Link>
      </section>

      <section className="facturacion-bloque facturacion-metodos">
        <header>
          <CreditCard aria-hidden="true" />
          <h2>Métodos de pago</h2>
        </header>
        {planPagado ? (
          <p>
            El medio de pago de tu suscripción se administra de forma segura en
            Mercado Pago.
          </p>
        ) : (
          <p>
            Al contratar un plan, vas a poder asociar tu medio de pago en
            Mercado Pago.
          </p>
        )}
        <Link className="facturacion-enlace" href="/panel/planes">
          {planPagado ? "Administrar suscripción" : "Ver planes"}
        </Link>
      </section>

      {planPagado && suscripcion?.estado !== "CANCELADA" && (
        <section className="facturacion-bloque facturacion-cancelacion">
          <div>
            <h2>Cancelar plan</h2>
            <p>
              Al cancelar, tu suscripción dejará de renovarse y Mercado Pago
              actualizará su estado.
            </p>
          </div>
          <BotonCancelarPlan />
        </section>
      )}
    </div>
  );
}

function fecha(valor: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(valor);
}
