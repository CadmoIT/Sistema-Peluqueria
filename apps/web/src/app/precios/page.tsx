/** Expone planes, paquetes de mensajeria y reglas comerciales transparentes. */
import Link from "next/link";
import DoneIcon from "@mui/icons-material/Done";
import { PLANES, PLAN_GRATIS, PLAN_PRO } from "@turnos/config";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import { EstilosPrecios } from "@/componentes/precios/estilos-precios";
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
        <EstilosPrecios>
          <section className="planes-grid">
            {[PLAN_GRATIS, ...PLANES, PLAN_PRO].map((plan) => (
              <article
                className={`plan-card plan-card--${plan.id.toLowerCase()}${plan.destacado ? " destacado" : ""}`}
                key={plan.id}
              >
                {plan.destacado && (
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
                        : plan.precioMensual.toLocaleString("es-AR")}
                  </strong>
                  {plan.precioMensual !== null && plan.precioMensual !== 0 && (
                    <span className="precio__moneda">ARS</span>
                  )}
                </div>
                <ul>
                  {plan.beneficios.map((b) => (
                    <li key={b}>
                      <DoneIcon aria-hidden="true" /> {b}
                    </li>
                  ))}
                  {plan.id !== "pro" && (
                    <>
                      <li>
                        <DoneIcon aria-hidden="true" /> Reservas, sedes y equipo
                        ilimitados
                      </li>
                      <li>
                        <DoneIcon aria-hidden="true" /> Mercado Pago y reportes
                      </li>
                    </>
                  )}
                </ul>
                {plan.id === "pro" ? (
                  <span
                    className="boton boton--secundario"
                    aria-disabled="true"
                  >
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
              </article>
            ))}
          </section>
        </EstilosPrecios>
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
