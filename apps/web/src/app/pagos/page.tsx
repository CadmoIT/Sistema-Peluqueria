/** Presenta una vista pública de planes y formas de comenzar. */
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANES, PLAN_GRATIS, PLAN_PRO, formatearPesos } from "@turnos/config";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import "../precios/precios.css";

export const metadata = { title: "Pagos y planes" };

export default function PaginaPagos() {
  const planes = [PLAN_GRATIS, ...PLANES, PLAN_PRO];
  return (
    <>
      <CabeceraPublica />
      <main className="precios">
        <section className="precios-hero">
          <span className="sobrelinea">PAGOS Y PLANES</span>
          <h1>
            Elegí cómo empezar.
            <br />
            <em>Sin sorpresas.</em>
          </h1>
          <p>
            Probá Turnos Rápidos gratis durante siete días y elegí el plan que
            acompañe el crecimiento de tu negocio.
          </p>
        </section>
        <section className="planes-grid" aria-label="Planes disponibles">
          {planes.map((plan) => (
            <article
              className={plan.destacado ? "destacado" : ""}
              key={plan.id}
            >
              {plan.destacado && (
                <span className="recomendado">MÁS ELEGIDO</span>
              )}
              <h2>{plan.nombre}</h2>
              <p>{plan.descripcion}</p>
              <div className="precio">
                <strong>
                  {plan.precioMensual === null
                    ? "A definir"
                    : plan.id === "PRUEBA"
                      ? "Gratis"
                      : formatearPesos(plan.precioMensual)}
                </strong>
                {plan.id !== "PRUEBA" && plan.precioMensual !== null && (
                  <span>
                    / mes
                    <br />
                    IVA incluido
                  </span>
                )}
              </div>
              {plan.id === "pro" ? (
                <span className="boton boton--secundario" aria-disabled="true">
                  Próximamente
                </span>
              ) : (
                <Link
                  href="/acceder?modo=registro"
                  className={`boton ${plan.destacado ? "boton--primario" : "boton--secundario"}`}
                >
                  {plan.id === "PRUEBA" ? "Probar gratis" : "Empezar"}
                </Link>
              )}
              <ul>
                {plan.beneficios.map((beneficio) => (
                  <li key={beneficio}>
                    <Check /> {beneficio}
                  </li>
                ))}
                <li>
                  <Check /> Reservas, sedes y equipo ilimitados
                </li>
                <li>
                  <Check /> Mercado Pago y reportes
                </li>
              </ul>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
