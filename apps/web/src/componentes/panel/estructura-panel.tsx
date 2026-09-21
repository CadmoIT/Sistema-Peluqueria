/** Compone el sidebar plegable y la navegación móvil compartidos por todo el panel. */
"use client";

import { Suspense, useEffect, useState, type CSSProperties } from "react";
import {
  EnlacePanel as Link,
  ProveedorNavegacionPanel,
  useNavegacionPanel,
} from "./navegacion-carga-panel";
import { SkeletonPanel } from "./skeleton-panel";
import { Menu, X } from "lucide-react";
import { obtenerEnlacesPanel, NavegacionPanel } from "./navegacion-panel";
import { usePerfilNegocio } from "./perfil-negocio-contexto";
import { NotificacionesPanel } from "./notificaciones-panel";
import { CuentaPanel } from "./cuenta-panel";

export function EstructuraPanel({
  children,
  nombreNegocio,
  emailUsuario,
  imagenNegocio,
}: {
  children: React.ReactNode;
  nombreNegocio: string;
  emailUsuario: string;
  imagenNegocio?: string;
}) {
  return (
    <ProveedorNavegacionPanel>
      <ContenidoEstructuraPanel
        nombreNegocio={nombreNegocio}
        emailUsuario={emailUsuario}
        imagenNegocio={imagenNegocio}
      >
        {children}
      </ContenidoEstructuraPanel>
    </ProveedorNavegacionPanel>
  );
}

function ContenidoEstructuraPanel({
  children,
  nombreNegocio,
  emailUsuario,
  imagenNegocio,
}: {
  children: React.ReactNode;
  nombreNegocio: string;
  emailUsuario: string;
  imagenNegocio?: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [contraido, setContraido] = useState(false);
  const [anchoSidebar, setAnchoSidebar] = useState(248);
  const navegacion = useNavegacionPanel();
  const destino = navegacion?.destino;
  const enlaces = obtenerEnlacesPanel(usePerfilNegocio());

  useEffect(() => {
    const guardadoContraido =
      window.localStorage.getItem("panel-sidebar-contraido") === "si";
    const guardado = Number(window.localStorage.getItem("panel-sidebar-ancho"));
    if (Number.isFinite(guardado)) {
      setAnchoSidebar(
        guardadoContraido || guardado <= 140
          ? 76
          : Math.min(380, Math.max(76, guardado)),
      );
      setContraido(guardadoContraido || guardado <= 140);
    } else {
      setContraido(guardadoContraido);
    }
  }, []);

  function alternarSidebar() {
    setContraido((actual) => {
      const siguiente = !actual;
      if (siguiente) {
        setAnchoSidebar(76);
        window.localStorage.setItem("panel-sidebar-ancho", "76");
      } else if (anchoSidebar <= 140) {
        setAnchoSidebar(248);
        window.localStorage.setItem("panel-sidebar-ancho", "248");
      }
      window.localStorage.setItem(
        "panel-sidebar-contraido",
        siguiente ? "si" : "no",
      );
      return siguiente;
    });
  }

  function cambiarAnchoSidebar(ancho: number) {
    const siguiente = Math.min(380, Math.max(76, Math.round(ancho)));
    if (siguiente <= 140) {
      setAnchoSidebar(76);
      setContraido(true);
      window.localStorage.setItem("panel-sidebar-ancho", "76");
      window.localStorage.setItem("panel-sidebar-contraido", "si");
      return;
    }
    setAnchoSidebar(siguiente);
    setContraido(false);
    window.localStorage.setItem("panel-sidebar-contraido", "no");
    window.localStorage.setItem("panel-sidebar-ancho", String(siguiente));
  }

  return (
    <div
      style={{ "--panel-sidebar-ancho": `${anchoSidebar}px` } as CSSProperties}
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
          movil
          onNavegar={() => setMenuAbierto(false)}
        />
      </div>
      <NavegacionPanel
        contraido={contraido}
        onAlternar={alternarSidebar}
        onAnchoChange={cambiarAnchoSidebar}
        anchoSidebar={anchoSidebar}
      />
      <main className="panel-main">
        <div className="panel-cuenta-flotante">
          <CuentaPanel
            nombreNegocio={nombreNegocio}
            emailUsuario={emailUsuario}
            imagenNegocio={imagenNegocio}
          />
        </div>
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
          <CuentaPanel
            nombreNegocio={nombreNegocio}
            emailUsuario={emailUsuario}
            imagenNegocio={imagenNegocio}
          />
        </header>
        {destino && <SkeletonPanel ruta={destino} />}
        <div
          hidden={Boolean(destino)}
          inert={destino ? true : undefined}
          aria-hidden={destino ? true : undefined}
        >
          {children}
        </div>
      </main>
      <nav className="panel-inferior" aria-label="Navegación móvil">
        {enlaces.slice(0, 4).map(({ texto, href, icono: Icono }) => (
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
