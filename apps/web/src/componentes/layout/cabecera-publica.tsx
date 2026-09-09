/** Renderiza la navegacion principal reutilizada por landing y precios. */
import Link from "next/link";
import { LogoTurnosRapidos } from "./logo-turnos-rapidos";

export function CabeceraPublica() {
  return (
    <header className="cabecera-publica">
      <div className="contenedor cabecera-publica__interior">
        <Link href="/" aria-label="Ir al inicio">
          <LogoTurnosRapidos />
        </Link>
        <nav aria-label="Navegacion principal">
          <Link href="/#beneficios">Soluciones</Link>
          <Link href="/#como-funciona">Cómo funciona</Link>
          <Link href="/precios">Precios</Link>
        </nav>
        <div className="cabecera-publica__acciones">
          <Link className="enlace-suave" href="/acceder?modo=ingreso">
            Ingresar
          </Link>
          <Link className="boton boton--primario" href="/acceder">
            <span>Probar gratis</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
