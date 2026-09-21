/** Presenta el avatar del negocio y las opciones de cuenta del panel. */
/* eslint-disable @next/next/no-img-element -- Las imágenes provienen del almacenamiento del negocio. */
"use client";

import {
  Building2,
  CalendarClock,
  CreditCard,
  Link2,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clienteAutenticacion } from "@/lib/cliente-autenticacion";
import { EnlacePanel as Link } from "./navegacion-carga-panel";

const opcionesCuenta = [
  { texto: "Datos del negocio", href: "/panel/configuracion/negocio", icono: Building2 },
  { texto: "Locales", href: "/panel/configuracion/locales", icono: MapPin },
  { texto: "Horarios", href: "/panel/configuracion/horarios", icono: CalendarClock },
  { texto: "Mensajes automáticos", href: "/panel/configuracion/avisos", icono: Mail },
  { texto: "Integraciones", href: "/panel/configuracion/integraciones", icono: Link2 },
  { texto: "Seguridad y cuenta", href: "/panel/configuracion/seguridad", icono: ShieldCheck },
  { texto: "Pagos y Facturación", href: "/panel/facturacion", icono: CreditCard },
] as const;

export function CuentaPanel({
  nombreNegocio,
  emailUsuario,
  imagenNegocio,
}: {
  nombreNegocio: string;
  emailUsuario: string;
  imagenNegocio?: string;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  function cerrarMenu() {
    menuRef.current?.removeAttribute("open");
  }

  useEffect(() => {
    function cerrarMenuDesdeDocumento() {
      menuRef.current?.removeAttribute("open");
    }
    function cerrarAlHacerClickAfuera(evento: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && evento.target instanceof Node && !menu.contains(evento.target)) {
        cerrarMenuDesdeDocumento();
      }
    }
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrarMenuDesdeDocumento();
    }
    document.addEventListener("pointerdown", cerrarAlHacerClickAfuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlHacerClickAfuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname]);

  return (
    <details ref={menuRef} className="panel-cuenta">
      <summary aria-label="Abrir menú del negocio">
        <Avatar nombre={nombreNegocio} imagen={imagenNegocio} />
      </summary>
      <div className="panel-cuenta__menu">
        <div className="panel-cuenta__identidad">
          <Avatar nombre={nombreNegocio} imagen={imagenNegocio} grande />
          <span>
            <strong>{nombreNegocio}</strong>
            <small>{emailUsuario}</small>
          </span>
        </div>
        <div className="panel-cuenta__opciones">
          {opcionesCuenta.map(({ texto, href, icono: Icono }) => (
            <Link
              key={href}
              href={href}
              className="panel-cuenta__opcion"
              onClick={cerrarMenu}
            >
              <span className="panel-cuenta__opcion-icono" aria-hidden>
                <Icono />
              </span>
              <span>{texto}</span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="panel-cuenta__salir"
          onClick={async () => {
            await clienteAutenticacion.signOut();
            window.location.assign("/acceder?modo=ingreso");
          }}
        >
          <LogOut aria-hidden /> Salir
        </button>
      </div>
    </details>
  );
}

function Avatar({
  nombre,
  imagen,
  grande = false,
}: {
  nombre: string;
  imagen?: string;
  grande?: boolean;
}) {
  return (
    <span className={`panel-cuenta__avatar${grande ? " panel-cuenta__avatar--grande" : ""}`}>
      {imagen ? <img src={imagen} alt="" /> : iniciales(nombre)}
    </span>
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
