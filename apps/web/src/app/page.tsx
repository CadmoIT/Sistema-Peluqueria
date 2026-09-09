/** Compone la landing comercial principal de TurnosRapidos. */
import { CabeceraPublica } from "../componentes/layout/cabecera-publica";
import { Hero } from "../componentes/landing/hero";
import { SeccionesLanding } from "../componentes/landing/secciones";
import { LogoTurnosRapidos } from "../componentes/layout/logo-turnos-rapidos";
import "./landing.css";

export default function PaginaInicio() {
  return (
    <>
      <CabeceraPublica />
      <main>
        <Hero />
        <SeccionesLanding />
      </main>
      <footer className="pie">
        <div className="contenedor">
          <LogoTurnosRapidos />
          <p>Tu tiempo vale. Tu negocio también.</p>
          <span>© 2026 Turnos Rápidos</span>
        </div>
      </footer>
    </>
  );
}
