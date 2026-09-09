/** Muestra la navegacion adaptable del panel de gestion. */
import Link from "next/link";
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

const items = [
  ["Resumen", LayoutDashboard],
  ["Agenda", CalendarDays],
  ["Clientes", ContactRound],
  ["Servicios", Scissors],
  ["Equipo", UsersRound],
  ["Inventario", Package],
  ["Caja", WalletCards],
  ["Reportes", BarChart3],
  ["Mi sitio", Store],
] as const;

export function NavegacionPanel() {
  return (
    <aside className="nav-panel">
      <div className="nav-panel__marca">
        <LogoTurnosRapidos />
      </div>
      <nav aria-label="Panel de gestion">
        {items.map(([texto, Icono], indice) => (
          <Link
            key={texto}
            href={texto === "Mi sitio" ? "/sitio/manly-barber" : "/panel"}
            className={indice === 0 ? "activo" : ""}
          >
            <Icono size={19} />
            <span>{texto}</span>
          </Link>
        ))}
      </nav>
      <Link className="nav-panel__ajustes" href="/panel">
        <Settings size={19} />
        <span>Configuracion</span>
      </Link>
      <div className="nav-panel__usuario">
        <span>LC</span>
        <div>
          <strong>Lucia Costa</strong>
          <small>Propietaria</small>
        </div>
      </div>
    </aside>
  );
}
