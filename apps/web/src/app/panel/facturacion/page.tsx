/** Muestra el estado de cobro y la información de facturación del negocio. */
import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { formatearPesos, nombrePlan } from "@turnos/config";
import { obtenerFacturacion } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { ControlRenovacionPlan } from "@/componentes/panel/control-renovacion-plan";

export const metadata = { title: "Facturación" };

export default async function PaginaFacturacion() {
  const { negocio, usuario, pagos, sede } = await obtenerFacturacion();
  const suscripcion = negocio.suscripcion;
  const esPlanDePago = Boolean(
    suscripcion && ["autogestionado", "pro"].includes(suscripcion.plan),
  );
  const planPagado = Boolean(esPlanDePago && suscripcion?.proveedorId);
  const puedeRenovar = Boolean(
    suscripcion?.proveedorId &&
      ["autogestionado", "pro"].includes(suscripcion.plan) &&
      ["ACTIVA", "EN_GRACIA"].includes(suscripcion.estado),
  );

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
            {planPagado && suscripcion?.cancelarAlFinal && suscripcion.proximoCobro
              ? `La renovación está cancelada. Conservás el acceso hasta el ${fecha(suscripcion.proximoCobro)}.`
              : suscripcion?.estado === "ACTIVA" && suscripcion.proximoCobro
                && planPagado
              ? `Tu plan se renueva automáticamente el ${fecha(suscripcion.proximoCobro)}.`
              : suscripcion?.pruebaFinalizaEn
                ? `La prueba finaliza el ${fecha(suscripcion.pruebaFinalizaEn)}.`
                : esPlanDePago
                  ? "Este plan no tiene una suscripción de Mercado Pago vinculada."
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
                <span>{nombrePlan(pago.plan ?? suscripcion?.plan)}</span>
                <time dateTime={(pago.pagadoEn ?? pago.creadoEn).toISOString()}>
                  {fecha(pago.pagadoEn ?? pago.creadoEn)}
                </time>
                <span className="facturacion-estado">
                  {pago.estado.replaceAll("_", " ")}
                </span>
                <strong>
                  {pago.moneda === "ARS"
                    ? formatearPesos(Number(pago.monto))
                    : `${pago.moneda} ${Number(pago.monto).toLocaleString("es-AR")}`}
                </strong>
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
            {esPlanDePago
              ? "Este plan no tiene un medio de pago de Mercado Pago asociado."
              : "Al contratar un plan, vas a poder asociar tu medio de pago en Mercado Pago."}
          </p>
        )}
        <Link className="facturacion-enlace" href="/panel/planes">
          {planPagado ? "Administrar suscripción" : "Ver planes"}
        </Link>
      </section>

      {puedeRenovar && (
        <section className="facturacion-bloque facturacion-cancelacion">
          <div>
            <h2>Renovación automática</h2>
            <p>
              {suscripcion?.cancelarAlFinal && suscripcion.proximoCobro
                ? `Si la mantenés desactivada, conservás el plan hasta el ${fecha(suscripcion.proximoCobro)} y no se realizará el próximo cobro.`
                : suscripcion?.proximoCobro
                  ? `Se cobrará automáticamente cada mes. El próximo cobro está previsto para el ${fecha(suscripcion.proximoCobro)}. Podés desactivarla y conservar el acceso hasta esa fecha.`
                  : "Se cobrará automáticamente cada mes. Podés desactivarla cuando quieras."}
            </p>
          </div>
          <ControlRenovacionPlan inicialmenteActiva={!suscripcion?.cancelarAlFinal} />
        </section>
      )}
    </div>
  );
}

function fecha(valor: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(valor);
}
