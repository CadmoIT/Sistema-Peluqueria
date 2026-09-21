/** Conserva la presentación del calendario con check en la landing pública. */
"use client";

export type TipoCarga = "landing" | "panel";

export function PantallaCarga({
  tipo,
  saliendo = false,
}: {
  tipo: "landing";
  saliendo?: boolean;
}) {
  return (
    <div
      className={`carga-pantalla carga-pantalla--${tipo}${saliendo ? " carga-pantalla--saliendo" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      data-testid="carga-aplicacion"
      data-tipo={tipo}
    >
      <div className="carga-pantalla__centro">
        <div className="showbox" aria-hidden="true">
          <div className="loader">
            <svg className="circular" viewBox="25 25 50 50">
              <circle
                className="path"
                cx="50"
                cy="50"
                r="20"
                fill="none"
                strokeWidth="2"
                strokeMiterlimit="10"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
