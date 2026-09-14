/** Compone el sidebar plegable y la navegación móvil compartidos por todo el panel. */
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { enlacesPanel, NavegacionPanel } from "./navegacion-panel";
import { NotificacionesPanel } from "./notificaciones-panel";

export function EstructuraPanel({
  children,
  nombreUsuario,
}: {
  children: React.ReactNode;
  nombreUsuario: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [contraido, setContraido] = useState(false);

  useEffect(() => {
    setContraido(
      window.localStorage.getItem("panel-sidebar-contraido") === "si",
    );
  }, []);

  function alternarSidebar() {
    setContraido((actual) => {
      const siguiente = !actual;
      window.localStorage.setItem(
        "panel-sidebar-contraido",
        siguiente ? "si" : "no",
      );
      return siguiente;
    });
  }

  return (
    <div
      className={
        contraido ? "panel-shell panel-shell--contraido" : "panel-shell"
      }
    >
      <Suspense fallback={null}>
        <NotificacionesPanel />
      </Suspense>
      <div
        className={menuAbierto ? "panel-overlay visible" : "panel-overlay"}
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      />
      <div
        id="panel-menu-movil"
        className={menuAbierto ? "panel-mobile abierto" : "panel-mobile"}
        inert={!menuAbierto}
      >
        <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
          <X />
        </button>
        <NavegacionPanel
          nombreUsuario={nombreUsuario}
          movil
          onNavegar={() => setMenuAbierto(false)}
        />
      </div>
      <NavegacionPanel
        nombreUsuario={nombreUsuario}
        contraido={contraido}
        onAlternar={alternarSidebar}
      />
      <main className="panel-main">
        <header className="panel-mobile-top">
          <button
            className="icono-boton menu-mobile"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="panel-menu-movil"
          >
            <Menu />
          </button>
          <strong>TurnosRápidos</strong>
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
        <button
          onClick={() => setMenuAbierto(true)}
          aria-expanded={menuAbierto}
          aria-controls="panel-menu-movil"
        >
          <Menu />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}
