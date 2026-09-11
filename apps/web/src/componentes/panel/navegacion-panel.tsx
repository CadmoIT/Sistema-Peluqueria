/** Renderiza la navegación real del panel y marca la ruta activa. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ContactRound,
  LayoutDashboard,
  Package,
  Scissors,
  Settings,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { LogoTurnosRapidos } from "@/componentes/layout/logo-turnos-rapidos";

export const enlacesPanel = [
  { texto: "Resumen", href: "/panel", icono: LayoutDashboard },
  { texto: "Agenda", href: "/panel/agenda", icono: CalendarDays },
  { texto: "Clientes", href: "/panel/clientes", icono: ContactRound },
  { texto: "Servicios", href: "/panel/servicios", icono: Scissors },
  { texto: "Equipo", href: "/panel/equipo", icono: UsersRound },
  { texto: "Inventario", href: "/panel/inventario", icono: Package },
  { texto: "Caja", href: "/panel/caja", icono: WalletCards },
  { texto: "Reportes", href: "/panel/reportes", icono: BarChart3 },
  { texto: "Mi sitio", href: "/panel/mi-sitio", icono: Store },
] as const;

export function NavegacionPanel({
  nombreUsuario = "Mi cuenta",
}: {
  nombreUsuario?: string;
}) {
  const ruta = usePathname();
  return (
    <aside className="nav-panel">
      <Link
        className="nav-panel__marca"
        href="/panel"
        aria-label="Ir al resumen"
      >
        <LogoTurnosRapidos />
      </Link>
      <nav aria-label="Panel de gestión">
        {enlacesPanel.map(({ texto, href, icono: Icono }) => {
          const activo =
            href === "/panel" ? ruta === href : ruta.startsWith(href);
          return (
            <Link key={href} href={href} className={activo ? "activo" : ""}>
              <Icono size={20} />
              <span>{texto}</span>
            </Link>
          );
        })}
      </nav>
      <Link className="nav-panel__ajustes" href="/panel/configuracion">
        <Settings size={20} />
        <span>Configuración</span>
      </Link>
      <div className="nav-panel__usuario">
        <span>{iniciales(nombreUsuario)}</span>
        <div>
          <strong>{nombreUsuario}</strong>
          <small>Mi cuenta</small>
        </div>
      </div>
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
