/** Compone la landing comercial principal de TurnosRapidos. */
import Link from "next/link";
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
        <div className="contenedor pie__interior">
          <div className="pie__marca">
            <LogoTurnosRapidos />
            <p>Tu tiempo vale. Tu negocio también.</p>
          </div>
          <nav className="pie__columna" aria-label="Producto">
            <strong>Producto</strong>
            <Link href="/#beneficios">Beneficios</Link>
            <Link href="/#como-funciona">Cómo funciona</Link>
            <Link href="/precios">Precios</Link>
          </nav>
          <nav className="pie__columna" aria-label="Contacto">
            <strong>Contacto</strong>
            <a href="mailto:cadmosoftware@gmail.com">cadmosoftware@gmail.com</a>
          </nav>
          <div className="pie__legal">
            <span>© 2026 Turnos Rápidos</span>
            <div>
              <Link href="/terminos">Términos y condiciones</Link>
              <Link href="/privacidad">Política de privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
