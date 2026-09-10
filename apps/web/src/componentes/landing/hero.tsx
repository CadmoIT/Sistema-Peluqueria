/** Presenta la pieza promocional principal y dirige al registro gratuito. */
import Image from "next/image";
import Link from "next/link";
import heroPromocional from "../../../../../imagenes/hero-turnosrapidos-azul.png";

export function Hero() {
  return (
    <section
      className="inicio-hero"
      aria-label="Prueba gratuita de Turnos Rápidos"
    >
      <div className="inicio-hero__lienzo">
        <Image
          className="inicio-hero__imagen"
          src={heroPromocional}
          alt="Profesionales de peluquería trabajando y gestionando sus turnos"
          priority
          sizes="(max-width: 1080px) 100vw, 1600px"
        />
        <Link className="inicio-hero__cta" href="/acceder?modo=registro">
          Probar gratis
        </Link>
      </div>
    </section>
  );
}
