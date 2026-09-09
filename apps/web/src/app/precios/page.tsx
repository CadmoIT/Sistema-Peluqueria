/** Expone planes, paquetes de mensajeria y reglas comerciales transparentes. */
import Link from "next/link";
import { Check, MessageCircleMore } from "lucide-react";
import { PLANES, PAQUETES_WHATSAPP, formatearPesos } from "@turnos/config";
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
            Configura tu negocio gratis. Elegí un plan solamente cuando estes
            listo para publicar.
          </p>
        </section>
        <section className="planes-grid">
          {PLANES.map((plan) => (
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
                <strong>{formatearPesos(plan.precioMensual)}</strong>
                <span>
                  / mes
                  <br />
                  IVA incluido
                </span>
              </div>
              <Link
                href="/acceder"
                className={`boton ${plan.destacado ? "boton--primario" : "boton--secundario"}`}
              >
                Empezar gratis
              </Link>
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
        <section className="whatsapp-planes">
          <div>
            <span className="icono-whatsapp">
              <MessageCircleMore />
            </span>
            <span className="sobrelinea">WHATSAPP OFICIAL</span>
            <h2>Recordatorios que llegan.</h2>
            <p>
              Conecta el numero de tu negocio. El saldo se comparte entre todas
              tus sedes y siempre podes ver cuanto consumiste.
            </p>
          </div>
          <div className="packs">
            {PAQUETES_WHATSAPP.map((p) => (
              <article key={p.mensajes}>
                <span>{p.mensajes.toLocaleString("es-AR")}</span>
                <small>mensajes / mes</small>
                <strong>{formatearPesos(p.precioMensual)}</strong>
                <small>IVA incluido</small>
              </article>
            ))}
          </div>
        </section>
        <section className="faq-precios">
          <h2>Preguntas frecuentes</h2>
          <details>
            <summary>¿Puedo probarlo sin pagar?</summary>
            <p>
              Si. Podes configurar y previsualizar todo sin tarjeta. El pago se
              solicita al publicar.
            </p>
          </details>
          <details>
            <summary>¿Cobran por sucursal o profesional?</summary>
            <p>No. Las sedes, profesionales y reservas no cambian tu plan.</p>
          </details>
          <details>
            <summary>¿Que pasa si ya tengo dominio?</summary>
            <p>
              El plan Autogestionado permite conectarlo sin costo adicional y
              mantiene disponible tu subdominio.
            </p>
          </details>
        </section>
      </main>
    </>
  );
}
