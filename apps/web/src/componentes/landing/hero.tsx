/** Presenta la propuesta de TurnosRápidos con fotografías y acceso al registro. */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CarruselHero } from "./carrusel-hero";
import "./hero.css";

export function Hero() {
  return (
    <section className="hero-fotografico" aria-labelledby="hero-titulo">
      <div className="hero-fotografico__contenido">
        <h1 id="hero-titulo">
          Reserva de turnos para tu negocio de manera sencilla y rápida
        </h1>
        <CarruselHero />
        <Link className="hero-fotografico__cta" href="/acceder?modo=registro">
          Probar gratis <ArrowRight size={22} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
