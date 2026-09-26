/** Expone planes, paquetes de mensajeria y reglas comerciales transparentes. */
import Link from "next/link";
import DoneIcon from "@mui/icons-material/Done";
import CloseIcon from "@mui/icons-material/Close";
import { PLANES, PLAN_GRATIS, PLAN_PRO } from "@turnos/config";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import { EstilosPrecios } from "@/componentes/precios/estilos-precios";
import { PreguntasFrecuentes } from "@/componentes/precios/preguntas-frecuentes";
import "./precios.css";
export const metadata = { title: "Precios" };

const caracteristicas = [
  {
    texto: "Siete días de prueba",
    incluye: (id: string) => id === "PRUEBA",
  },
  { texto: "Sitio de reservas", incluye: () => true },
  { texto: "Avisos por email", incluye: () => true },
  {
    texto: "Sedes y profesionales ilimitados",
    incluye: () => true,
  },
  {
    texto: "Confirmaciones y recordatorios por email",
    incluye: () => true,
  },
  {
    texto: "Mercado Pago y reportes",
    incluye: () => true,
  },
  {
    texto: "Recordatorios por WhatsApp",
    incluye: (id: string) => id !== "autogestionado",
  },
];

export default function PaginaPrecios() {
  return (
    <>
      <CabeceraPublica />
      <main className="precios">
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
                <h2>{plan.id === "pro" ? "Pro" : plan.nombre}</h2>
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
                <ul aria-label={`Características del plan ${plan.nombre}`}>
                  <li className="incluido">
                    <DoneIcon aria-hidden="true" />
                    {plan.id === "PRUEBA"
                      ? "1 negocio"
                      : plan.id === "pro"
                        ? "Negocios ilimitados"
                        : "2 negocios"}
                  </li>
                  {caracteristicas
                    .filter(({ texto }) =>
                      plan.id === "PRUEBA"
                        ? texto === "Siete días de prueba"
                        : plan.id === "autogestionado"
                          ? texto !== "Siete días de prueba"
                          : texto !== "Siete días de prueba",
                    )
                    .map(({ texto, incluye }) => {
                      const disponible = incluye(plan.id);
                      return (
                        <li
                          className={disponible ? "incluido" : "no-incluido"}
                          key={texto}
                        >
                          {disponible ? (
                            <DoneIcon aria-hidden="true" />
                          ) : (
                            <CloseIcon aria-hidden="true" />
                          )}
                          {texto}
                        </li>
                      );
                    })}
                </ul>
                <Link
                  href={
                    plan.id === "pro" ? "/acceder?modo=ingreso" : "/acceder"
                  }
                  className={`boton ${plan.destacado ? "boton--primario" : "boton--secundario"}`}
                >
                  {plan.id === "PRUEBA" ? "Probar gratis" : "Empezar"}
                </Link>
              </article>
            ))}
          </section>
        </EstilosPrecios>
        <PreguntasFrecuentes />
      </main>
    </>
  );
}
