/** Ofrece recuperación sin depender del indicador global ni divulgar errores internos. */
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export default function ErrorSitio({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <main
      style={{ maxWidth: 600, margin: "60px auto", padding: 24 }}
      role="alert"
    >
      <h1>No pudimos cargar este sitio</h1>
      <p>Intentá nuevamente para ver los servicios y reservar tu turno.</p>
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(() => {
            router.refresh();
            reset();
          })
        }
      >
        {pendiente ? "Reintentando…" : "Reintentar"}
      </button>
    </main>
  );
}
