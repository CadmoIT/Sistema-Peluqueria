"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Actualiza solo durante la espera; no inicia cobros ni consulta al proveedor. */
export function ConfirmacionPago({ mensaje }: { mensaje: string }) {
  const router = useRouter();
  const [actualizando, iniciarActualizacion] = useTransition();
  const enCurso = useRef(false);
  const [vencido, setVencido] = useState(false);

  useEffect(() => {
    enCurso.current = actualizando;
  }, [actualizando]);

  useEffect(() => {
    const limite = Date.now() + 120_000;
    const intervalo = setInterval(() => {
      if (Date.now() >= limite) {
        setVencido(true);
        clearInterval(intervalo);
        return;
      }
      if (document.visibilityState !== "visible" || enCurso.current) return;
      enCurso.current = true;
      iniciarActualizacion(() => router.refresh());
    }, 5_000);
    return () => clearInterval(intervalo);
  }, [router]);

  return (
    <p className="facturacion-aviso" role="status" aria-live="polite">
      {vencido
        ? "La confirmación está tardando más de lo esperado. No vuelvas a pagar; podés recargar esta página más tarde o contactar a soporte."
        : mensaje}
    </p>
  );
}
