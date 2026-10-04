/** Permite recuperar un sitio público fallido sin dejar al visitante en una espera indefinida. */
"use client";
export default function ErrorSitio({ reset }: { reset: () => void }) {
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <h1>No pudimos cargar el sitio</h1>
      <p>Intentá nuevamente en unos instantes.</p>
      <button className="boton" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
