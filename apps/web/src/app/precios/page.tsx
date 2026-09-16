/** Expone planes, paquetes de mensajeria y reglas comerciales transparentes. */
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANES, PLAN_GRATIS, PLAN_PRO, formatearPesos } from "@turnos/config";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import "./precios.css";
export const metadata = { title: "Precios" };
export default function PaginaPrecios() {
  return (
    <>
      <CabeceraPublica />
      <main className="precios">
        <section className="precios-hero">
          <span className="sobrelinea">PRECIOS CLAROS</span>
          <h1>
            Todo lo que necesitas.
            <br />
            <em>Sin letra chica.</em>
          </h1>
          <p>
            Probá tu agenda y tu sitio gratis durante siete días. Después elegí
            el plan que acompañe tu negocio.
          </p>
        </section>
        <section className="planes-grid">
          {[PLAN_GRATIS, ...PLANES, PLAN_PRO].map((plan) => (
            <article
              className={plan.destacado ? "destacado" : ""}
              key={plan.id}
            >
              {plan.destacado && (
                <span className="recomendado">MAS ELEGIDO</span>
              )}
              <h2>{plan.nombre}</h2>
              <p>{plan.descripcion}</p>
              <div className="precio">
                <strong>
                  {plan.precioMensual === null
                    ? "A definir"
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
                  href="/acceder"
                  className={`boton ${plan.destacado ? "boton--primario" : "boton--secundario"}`}
                >
                  {plan.id === "PRUEBA" ? "Probar gratis" : "Empezar"}
                </Link>
              )}
              <ul>
                {plan.beneficios.map((b) => (
                  <li key={b}>
                    <Check /> {b}
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
        <section className="faq-precios">
          <h2>Preguntas frecuentes</h2>
          <details>
            <summary>¿Puedo probarlo sin pagar?</summary>
            <p>
              Sí. El plan Gratis permite usar la agenda y el sitio durante siete
              días, sin tarjeta.
            </p>
          </details>
          <details>
            <summary>¿Cobran por sucursal o profesional?</summary>
            <p>No. Las sedes, profesionales y reservas no cambian tu plan.</p>
          </details>
          <details>
            <summary>¿Que pasa si ya tengo dominio?</summary>
            <p>
              El plan Plus permite conectarlo sin costo adicional y mantiene
              disponible tu subdominio.
            </p>
          </details>
        </section>
      </main>
    </>
  );
}
