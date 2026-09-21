/** Permite recuperar una vista fallida y libera cualquier espera de navegación o ingreso. */
"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCargaAplicacion } from "@/componentes/carga/proveedor-carga";
import { useNavegacionPanel } from "@/componentes/panel/navegacion-carga-panel";

export default function ErrorPanel({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [reintentando, comenzarReintento] = useTransition();
  const { cancelarIngreso } = useCargaAplicacion();
  const cancelarNavegacion = useNavegacionPanel()?.cancelar;
  useEffect(() => {
    cancelarIngreso();
    cancelarNavegacion?.();
  }, [cancelarIngreso, cancelarNavegacion]);
  return (
    <section className="panel-contenido" role="alert">
      <h1>No pudimos cargar esta pantalla</h1>
      <p>Intentá nuevamente para continuar.</p>
      <button
        className="boton boton--primario"
        disabled={reintentando}
        onClick={() =>
          comenzarReintento(() => {
            router.refresh();
            reset();
          })
        }
      >
        {reintentando ? "Reintentando…" : "Reintentar"}
      </button>
    </section>
  );
}
