/** Presenta los términos de uso iniciales de Turnos Rápidos. */
import Link from "next/link";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import "../legal.css";

export const metadata = { title: "Términos y condiciones" };

export default function PaginaTerminos() {
  return (
    <>
      <CabeceraPublica />
      <main className="pagina-legal contenedor">
        <Link className="pagina-legal__volver" href="/">
          ← Volver al inicio
        </Link>
        <p className="pagina-legal__etiqueta">Información legal</p>
        <h1>Términos y condiciones</h1>
        <p className="pagina-legal__actualizacion">
          Última actualización: septiembre de 2026
        </p>
        <section>
          <h2>Uso del servicio</h2>
          <p>
            Turnos Rápidos ayuda a organizar agendas, clientes, servicios y
            reservas online. Cada negocio es responsable de la información que
            carga y de las condiciones que ofrece a sus clientes.
          </p>
        </section>
        <section>
          <h2>Cuenta y suscripción</h2>
          <p>
            La persona administradora debe mantener sus datos de acceso seguros.
            Las pruebas y los planes disponibles se informan en la página de
            precios y se activan según la confirmación correspondiente.
          </p>
        </section>
        <section>
          <h2>Reservas y pagos</h2>
          <p>
            El negocio define sus horarios, servicios, precios y políticas de
            reserva. Turnos Rápidos no reemplaza comprobantes fiscales ni
            garantiza la asistencia de una persona a su turno.
          </p>
        </section>
        <section>
          <h2>Contacto</h2>
          <p>
            Si necesitás ayuda, escribinos a
            <a href="mailto:soporte@turnosrapidos.com.ar">
              {" "}
              soporte@turnosrapidos.com.ar
            </a>
            .
          </p>
        </section>
      </main>
    </>
  );
}
