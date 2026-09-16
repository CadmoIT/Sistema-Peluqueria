/** Explica de forma clara cómo se utilizan los datos en Turnos Rápidos. */
import Link from "next/link";
import { CabeceraPublica } from "../../componentes/layout/cabecera-publica";
import "../legal.css";

export const metadata = { title: "Política de privacidad" };

export default function PaginaPrivacidad() {
  return (
    <>
      <CabeceraPublica />
      <main className="pagina-legal contenedor">
        <Link className="pagina-legal__volver" href="/">
          ← Volver al inicio
        </Link>
        <p className="pagina-legal__etiqueta">Información legal</p>
        <h1>Política de privacidad</h1>
        <p className="pagina-legal__actualizacion">
          Última actualización: septiembre de 2026
        </p>
        <section>
          <h2>Qué información usamos</h2>
          <p>
            Guardamos los datos necesarios para crear tu cuenta y para que tu
            negocio gestione reservas, clientes, servicios y comunicaciones.
          </p>
        </section>
        <section>
          <h2>Para qué la usamos</h2>
          <p>
            Utilizamos la información para prestar el servicio, proteger las
            cuentas, mostrar el sitio público del negocio y responder consultas
            de soporte. No vendemos datos personales.
          </p>
        </section>
        <section>
          <h2>Control y conservación</h2>
          <p>
            El negocio puede actualizar sus datos desde el panel. Conservamos la
            información mientras la cuenta esté activa o cuando sea necesario
            para cumplir obligaciones legales y resolver reclamos.
          </p>
        </section>
        <section>
          <h2>Consultas</h2>
          <p>
            Para ejercer tus derechos o hacer una consulta, escribinos a
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
