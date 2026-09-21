/** Mantiene el loader visible durante el ingreso, la animación mínima y las vistas suspendidas. */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { PantallaCarga, type TipoCarga } from "./pantalla-carga";
import { CalendarioEntradaPanel } from "./calendario-entrada-panel";

type Carga = {
  tipo: TipoCarga;
  inicio: number;
  listo: boolean;
  esperandoDestino: boolean;
};
type AccionesCarga = {
  iniciarIngreso: () => void;
  cancelarIngreso: () => void;
  registrarEspera: () => () => void;
  notificarVistaLista: (ruta: string) => void;
};
const ContextoCarga = createContext<AccionesCarga | null>(null);
const claveIngreso = "turnos-carga-ingreso";
const claveLandingVista = "turnos-landing-loader-visto";
const esRutaPublica = (ruta: string) => ruta === "/";
function mostrarLandingUnaVez() {
  try {
    if (sessionStorage.getItem(claveLandingVista)) return false;
    sessionStorage.setItem(claveLandingVista, "1");
    return true;
  } catch {
    return true;
  }
}
const crearCarga = (tipo: TipoCarga, esperandoDestino = false): Carga => ({
  tipo,
  inicio: Date.now(),
  listo: false,
  esperandoDestino,
});

function guardarIngreso(pendiente: boolean) {
  try {
    if (pendiente) sessionStorage.setItem(claveIngreso, String(Date.now()));
    else sessionStorage.removeItem(claveIngreso);
  } catch {
    /* El loader funciona igualmente cuando el navegador bloquea almacenamiento. */
  }
}

export function ProveedorCarga({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const anterior = useRef(ruta);
  const rutaActual = useRef(ruta);
  rutaActual.current = ruta;
  const vistaLista = useRef<string | null>(null);
  const [carga, cambiarCarga] = useState<Carga | null>(() =>
    esRutaPublica(ruta)
      ? crearCarga("landing")
      : ruta.startsWith("/panel")
        ? crearCarga("panel")
        : null,
  );
  const [esperas, cambiarEsperas] = useState(0);
  const [saliendo, cambiarSalida] = useState(false);
  const [montado, cambiarMontado] = useState(false);
  const [fuentesListas, prepararFuentes] = useState(false);
  useEffect(() => {
    cambiarMontado(true);
    if (ruta === "/") {
      try {
        if (sessionStorage.getItem(claveLandingVista)) cambiarCarga(null);
        else sessionStorage.setItem(claveLandingVista, "1");
      } catch {
        /* Si el almacenamiento está bloqueado, se conserva la primera carga. */
      }
    }
  }, [ruta]);
  const iniciarIngreso = useCallback(() => {
    guardarIngreso(true);
    vistaLista.current = null;
    cambiarSalida(false);
    cambiarCarga(crearCarga("panel", true));
  }, []);
  const cancelarIngreso = useCallback(() => {
    guardarIngreso(false);
    cambiarSalida(false);
    cambiarCarga(null);
  }, []);
  const registrarEspera = useCallback(() => {
    cambiarEsperas((n) => n + 1);
    return () => cambiarEsperas((n) => Math.max(0, n - 1));
  }, []);
  const notificarVistaLista = useCallback(
    (vista: string) => {
      if (vista !== rutaActual.current) return;
      vistaLista.current = vista;
      if (vista === "/primeros-pasos") {
        cancelarIngreso();
        return;
      }
      guardarIngreso(false);
      cambiarCarga((actual) =>
        actual?.tipo === "panel"
          ? { ...actual, listo: true, esperandoDestino: false }
          : actual,
      );
    },
    [cancelarIngreso],
  );

  useEffect(() => {
    if (ruta !== anterior.current && !carga) {
      if (esRutaPublica(ruta) && mostrarLandingUnaVez())
        cambiarCarga(crearCarga("landing"));
      else if (
        ruta.startsWith("/panel") &&
        !anterior.current.startsWith("/panel")
      )
        cambiarCarga({
          ...crearCarga("panel"),
          listo: vistaLista.current === ruta,
        });
    }
    if (
      carga?.tipo === "panel" &&
      !ruta.startsWith("/panel") &&
      ruta !== "/primeros-pasos" &&
      !carga.esperandoDestino
    )
      cancelarIngreso();
    if (carga?.tipo === "landing" && ruta !== "/") cancelarIngreso();
    anterior.current = ruta;
  }, [ruta, carga, cancelarIngreso]);

  useEffect(() => {
    try {
      const pendiente = Number(sessionStorage.getItem(claveIngreso));
      if (
        pendiente &&
        Date.now() - pendiente < 600_000 &&
        (ruta === "/primeros-pasos" || ruta.startsWith("/panel"))
      ) {
        if (ruta.startsWith("/panel"))
          cambiarCarga(
            (actual) =>
              actual ?? {
                ...crearCarga("panel"),
                listo: vistaLista.current === ruta,
              },
          );
        guardarIngreso(false);
      }
    } catch {
      /* Google también puede volver en navegadores con almacenamiento restringido. */
    }
  }, [ruta]);

  const inicio = carga?.inicio;
  const esperandoDestino = carga?.esperandoDestino;
  const tipo = carga?.tipo;
  useEffect(() => {
    prepararFuentes(false);
    if (inicio === undefined) return;
    let vigente = true;
    void document.fonts.ready.then(() => {
      if (vigente) prepararFuentes(true);
    });
    return () => {
      vigente = false;
    };
  }, [inicio]);
  useEffect(() => {
    if (inicio === undefined || esperandoDestino || tipo !== "landing") return;
    let vigente = true;
    const listo = async () => {
      await document.fonts.ready;
      if (vigente)
        cambiarCarga((actual) =>
          actual?.inicio === inicio ? { ...actual, listo: true } : actual,
        );
    };
    if (document.readyState === "complete") void listo();
    else window.addEventListener("load", listo, { once: true });
    return () => {
      vigente = false;
      window.removeEventListener("load", listo);
    };
  }, [inicio, esperandoDestino, tipo]);

  useEffect(() => {
    if (carga?.tipo !== "landing" || !carga.listo || esperas > 0) {
      cambiarSalida(false);
      return;
    }
    const minimo = 900;
    const temporizador = window.setTimeout(
      () => cambiarSalida(true),
      Math.max(0, minimo - (Date.now() - carga.inicio)),
    );
    return () => window.clearTimeout(temporizador);
  }, [carga, esperas]);

  useEffect(() => {
    if (!saliendo) return;
    const temporizador = window.setTimeout(() => {
      cambiarCarga(null);
      cambiarSalida(false);
    }, 420);
    return () => window.clearTimeout(temporizador);
  }, [saliendo]);

  const visible = carga !== null;
  useEffect(() => {
    if (!visible) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [visible]);
  const finalizarEntrada = useCallback(() => {
    cambiarCarga(null);
    cambiarSalida(false);
  }, []);

  return (
    <ContextoCarga.Provider
      value={{
        iniciarIngreso,
        cancelarIngreso,
        registrarEspera,
        notificarVistaLista,
      }}
    >
      <div
        className="carga-contenido"
        inert={visible && montado ? true : undefined}
        aria-busy={visible}
      >
        {children}
      </div>
      {carga?.tipo === "landing" && (
        <PantallaCarga tipo="landing" saliendo={saliendo} />
      )}
      {carga?.tipo === "panel" && (
        <CalendarioEntradaPanel
          key={carga.inicio}
          listo={carga.listo && fuentesListas && esperas === 0}
          onFinalizar={finalizarEntrada}
        />
      )}
      <noscript>
        {/* React entrega los segmentos resueltos ocultos hasta ejecutar su script de inserción. */}
        <style>
          {
            ".carga-pantalla, [data-testid='skeleton-panel'] { display: none !important; } div[hidden][id^='S:'] { display: block !important; }"
          }
        </style>
      </noscript>
    </ContextoCarga.Provider>
  );
}

export function useCargaAplicacion() {
  const contexto = useContext(ContextoCarga);
  if (!contexto)
    throw new Error("La carga debe utilizarse dentro de ProveedorCarga.");
  return contexto;
}

export function EsperaVista() {
  const { registrarEspera } = useCargaAplicacion();
  useEffect(() => registrarEspera(), [registrarEspera]);
  return null;
}

/** Se monta dentro del contenido resuelto, nunca dentro de un fallback. */
export function VistaCargaLista({ ruta }: { ruta: string }) {
  const { notificarVistaLista } = useCargaAplicacion();
  useEffect(() => notificarVistaLista(ruta), [ruta, notificarVistaLista]);
  return null;
}
