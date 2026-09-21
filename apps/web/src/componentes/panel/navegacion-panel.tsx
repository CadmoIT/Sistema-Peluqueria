/** Renderiza la navegación real del panel y marca la ruta activa. */
"use client";

import { EnlacePanel as Link } from "./navegacion-carga-panel";
import { usePathname } from "next/navigation";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import {
  BarChart3,
  CalendarDays,
  ContactRound,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";
import { usePerfilNegocio } from "./perfil-negocio-contexto";
import { obtenerIconoServicios } from "./iconos-rubro";
import { PERFILES_NEGOCIO, type PerfilNegocio } from "@/lib/perfiles-negocio";

export const enlacesPanel = [
  { texto: "Resumen", href: "/panel/resumen", icono: LayoutDashboard },
  { texto: "Agenda", href: "/panel/agenda", icono: CalendarDays },
  { texto: "Clientes", href: "/panel/clientes", icono: ContactRound },
  {
    texto: "Servicios",
    href: "/panel/servicios",
    icono: obtenerIconoServicios(PERFILES_NEGOCIO.general.iconoServicios),
  },
  { texto: "Equipo", href: "/panel/equipo", icono: UsersRound },
  { texto: "Inventario", href: "/panel/inventario", icono: Package },
  { texto: "Compras", href: "/panel/compras", icono: ShoppingCart },
  { texto: "Caja", href: "/panel/caja", icono: WalletCards },
  { texto: "Reportes", href: "/panel/reportes", icono: BarChart3 },
  { texto: "Mi sitio", href: "/panel/mi-sitio", icono: Store },
] as const;

export function obtenerEnlacesPanel(perfil: PerfilNegocio) {
  return enlacesPanel.map((enlace) =>
    enlace.href === "/panel/servicios"
      ? { ...enlace, icono: obtenerIconoServicios(perfil.iconoServicios) }
      : enlace,
  );
}

export function NavegacionPanel({
  contraido = false,
  movil = false,
  onAlternar,
  onNavegar,
  onAnchoChange,
  anchoSidebar = 248,
}: {
  contraido?: boolean;
  movil?: boolean;
  onAlternar?: () => void;
  onNavegar?: () => void;
  onAnchoChange?: (ancho: number) => void;
  anchoSidebar?: number;
}) {
  const ruta = usePathname();
  const enlaces = obtenerEnlacesPanel(usePerfilNegocio());
  return (
    <aside
      className={contraido ? "nav-panel nav-panel--contraido" : "nav-panel"}
    >
      <div className="nav-panel__cabecera">
        {contraido && !movil ? (
          <button
            className="nav-panel__alternar-arriba"
            onClick={onAlternar}
            aria-label="Expandir menú"
            title="Expandir menú"
          >
            <Menu size={22} />
          </button>
        ) : (
          <>
            <Link
              className="nav-panel__marca"
              href="/panel/resumen"
              aria-label="Ir al resumen"
              onClick={onNavegar}
            >
              <LogoTurnosRapidos />
            </Link>
            {!movil && (
              <button
                className="nav-panel__plegar"
                onClick={onAlternar}
                aria-label="Contraer menú"
                title="Contraer menú"
              >
                <KeyboardDoubleArrowLeftIcon />
              </button>
            )}
          </>
        )}
      </div>
      <nav aria-label="Panel de gestión">
        {enlaces.map(({ texto, href, icono: Icono }) => {
          const activo = ruta === href || ruta.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={activo ? "activo" : ""}
              aria-current={activo ? "page" : undefined}
              title={contraido ? texto : undefined}
              aria-label={contraido ? texto : undefined}
              onClick={onNavegar}
            >
              <Icono size={20} />
              <span>{texto}</span>
            </Link>
          );
        })}
      </nav>
      {!movil && (
        <div
            className="nav-panel__redimensionar"
            role="separator"
            aria-orientation="vertical"
            aria-label="Cambiar ancho del sidebar"
            aria-valuemin={76}
            aria-valuemax={380}
            aria-valuenow={anchoSidebar}
            tabIndex={0}
            onKeyDown={(evento) => {
              if (evento.key === "ArrowLeft") {
                evento.preventDefault();
                onAnchoChange?.(anchoSidebar - 8);
              }
              if (evento.key === "ArrowRight") {
                evento.preventDefault();
                onAnchoChange?.(anchoSidebar + 8);
              }
            }}
            onPointerDown={(evento) => {
              evento.preventDefault();
              const inicioX = evento.clientX;
              const inicioAncho = anchoSidebar;
              const mover = (movimiento: PointerEvent) => {
                onAnchoChange?.(inicioAncho + movimiento.clientX - inicioX);
              };
              const terminar = () => {
                window.removeEventListener("pointermove", mover);
                window.removeEventListener("pointerup", terminar);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              window.addEventListener("pointermove", mover);
              window.addEventListener("pointerup", terminar, { once: true });
            }}
          />
      )}
    </aside>
  );
}
