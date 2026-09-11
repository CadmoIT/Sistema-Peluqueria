/** Compone el header, sidebar y navegación móvil compartidos por todo el panel. */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ExternalLink, Menu, X } from "lucide-react";
import { enlacesPanel, NavegacionPanel } from "./navegacion-panel";

export function EstructuraPanel({
  children,
  nombreNegocio,
  nombreUsuario,
  slug,
}: {
  children: React.ReactNode;
  nombreNegocio: string;
  nombreUsuario: string;
  slug: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <div className="panel-shell">
      <div
        className={menuAbierto ? "panel-overlay visible" : "panel-overlay"}
        onClick={() => setMenuAbierto(false)}
      />
      <div className={menuAbierto ? "panel-mobile abierto" : "panel-mobile"}>
        <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
          <X />
        </button>
        <NavegacionPanel nombreUsuario={nombreUsuario} />
      </div>
      <NavegacionPanel nombreUsuario={nombreUsuario} />
      <main className="panel-main">
        <header className="panel-top">
          <button
            className="icono-boton menu-mobile"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
          <div className="panel-top__negocio">
            <small>ESPACIO DE TRABAJO</small>
            <strong>{nombreNegocio}</strong>
          </div>
          <div className="panel-top__acciones">
            <button className="icono-boton" aria-label="Notificaciones">
              <Bell size={19} />
              <i />
            </button>
            <Link
              href={`/sitio/${slug}`}
              className="boton boton--claro"
              target="_blank"
            >
              Ver mi sitio <ExternalLink size={16} />
            </Link>
          </div>
        </header>
        {children}
      </main>
      <nav className="panel-inferior" aria-label="Navegación móvil">
        {enlacesPanel.slice(0, 4).map(({ texto, href, icono: Icono }) => (
          <Link key={href} href={href}>
            <Icono />
            <span>{texto}</span>
          </Link>
        ))}
        <button onClick={() => setMenuAbierto(true)}>
          <Menu />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
