/** Renderiza la navegación real del panel y marca la ruta activa. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ContactRound,
  CreditCard,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
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
  nombreUsuario = "Mi cuenta",
  contraido = false,
  movil = false,
  onAlternar,
  onNavegar,
}: {
  nombreUsuario?: string;
  contraido?: boolean;
  movil?: boolean;
  onAlternar?: () => void;
  onNavegar?: () => void;
}) {
  const ruta = usePathname();
  const enlaces = obtenerEnlacesPanel(usePerfilNegocio());
  return (
    <aside
      className={contraido ? "nav-panel nav-panel--contraido" : "nav-panel"}
    >
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
        <Link
          className="nav-panel__marca"
          href="/panel/resumen"
          aria-label="Ir al resumen"
          onClick={onNavegar}
        >
          <LogoTurnosRapidos />
        </Link>
      )}
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
      <details
        className="nav-panel__configuracion"
        open={
          ruta.startsWith("/panel/configuracion") ||
          ruta.startsWith("/panel/facturacion")
        }
      >
        <summary
          title={contraido ? "Configuración" : undefined}
          aria-label={contraido ? "Configuración" : undefined}
        >
          <Settings size={20} />
          <span>Configuración</span>
        </summary>
        <div>
          <Link
            href="/panel/configuracion"
            className={ruta.startsWith("/panel/configuracion") ? "activo" : ""}
            onClick={onNavegar}
          >
            <Settings size={18} />
            <span>Configuraciones</span>
          </Link>
          <Link
            href="/panel/facturacion"
            className={ruta.startsWith("/panel/facturacion") ? "activo" : ""}
            onClick={onNavegar}
          >
            <CreditCard size={18} />
            <span>Pagos y Facturación</span>
          </Link>
        </div>
      </details>
      <div className="nav-panel__usuario">
        <span>{iniciales(nombreUsuario)}</span>
        <div>
          <strong>{nombreUsuario}</strong>
          <small>Mi cuenta</small>
        </div>
      </div>
      {!movil && !contraido && (
        <button
          className="nav-panel__plegar"
          onClick={onAlternar}
          aria-label="Contraer menú"
        >
          <ChevronLeft />
        </button>
      )}
    </aside>
  );
}

function iniciales(nombre: string) {
  return (
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase() || "TR"
  );
}
