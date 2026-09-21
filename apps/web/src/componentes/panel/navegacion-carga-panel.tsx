/** Muestra feedback desde la intención de navegar y espera el contenido montado del destino. */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCargaAplicacion } from "@/componentes/carga/proveedor-carga";

type Navegacion = {
  destino: string | null;
  enTransicion: boolean;
  navegar: (href: string, scroll?: boolean) => void;
  vistaMontada: (ruta: string) => void;
  cancelar: () => void;
};
const ContextoNavegacion = createContext<Navegacion | null>(null);

export function ProveedorNavegacionPanel({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [destino, cambiarDestino] = useState<string | null>(null);
  const ultimoDestino = useRef<string | null>(null);
  const [enTransicion, comenzarTransicion] = useTransition();
  const cancelar = useCallback(() => {
    ultimoDestino.current = null;
    cambiarDestino(null);
  }, []);
  useEffect(() => {
    window.addEventListener("popstate", cancelar);
    return () => window.removeEventListener("popstate", cancelar);
  }, [cancelar]);
  const navegar = useCallback(
    (href: string, scroll?: boolean) => {
      const siguiente = new URL(href, window.location.origin).pathname;
      ultimoDestino.current = siguiente;
      cambiarDestino(siguiente === ruta ? null : siguiente);
      comenzarTransicion(() => {
        router.push(href, { scroll });
      });
    },
    [router, ruta],
  );
  const vistaMontada = useCallback(
    (vista: string) => {
      if (ultimoDestino.current === vista) cancelar();
    },
    [cancelar],
  );
  return (
    <ContextoNavegacion.Provider
      value={{ destino, enTransicion, navegar, vistaMontada, cancelar }}
    >
      {children}
    </ContextoNavegacion.Provider>
  );
}

export function useNavegacionPanel() {
  return useContext(ContextoNavegacion);
}

export function EnlacePanel({
  href,
  onNavigate,
  scroll,
  ...props
}: ComponentProps<typeof Link>) {
  const navegacion = useNavegacionPanel();
  const ruta = usePathname();
  return (
    <Link
      {...props}
      href={href}
      scroll={scroll}
      onNavigate={(evento) => {
        let cancelado = false;
        onNavigate?.({
          preventDefault: () => {
            cancelado = true;
            evento.preventDefault();
          },
        });
        if (cancelado || !navegacion || typeof href !== "string") return;
        const url = new URL(href, window.location.origin);
        if (
          url.origin !== window.location.origin ||
          !url.pathname.startsWith("/panel/") ||
          (url.pathname === ruta && !navegacion.destino)
        )
          return;
        evento.preventDefault();
        navegacion.navegar(href, scroll);
      }}
    />
  );
}

/** Notifica por separado la vista del servidor y la intención de navegación más reciente. */
export function VistaPanelLista({ ruta }: { ruta: string }) {
  const actual = usePathname();
  const { notificarVistaLista } = useCargaAplicacion();
  const vistaMontada = useNavegacionPanel()?.vistaMontada;
  useEffect(() => {
    if (actual !== ruta) return;
    notificarVistaLista(ruta);
    vistaMontada?.(ruta);
  }, [actual, ruta, notificarVistaLista, vistaMontada]);
  return null;
}
