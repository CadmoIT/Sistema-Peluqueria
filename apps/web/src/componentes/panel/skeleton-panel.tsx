/** Comparte las siluetas entre las esperas del servidor y la navegación inmediata del cliente. */
"use client";
import { EsperaVista } from "@/componentes/carga/proveedor-carga";

const nombres: Record<string, string> = {
  resumen: "resumen",
  agenda: "agenda",
  clientes: "clientes",
  servicios: "servicios",
  equipo: "equipo",
  inventario: "inventario",
  compras: "compras",
  caja: "caja",
  reportes: "reportes",
  "mi-sitio": "editor",
  configuracion: "configuraciones",
  facturacion: "facturación",
};
export function SkeletonPanel({ ruta }: { ruta: string }) {
  const modulo = ruta.split("/")[2] || "resumen";
  return (
    <div
      className={`panel-contenido${modulo === "agenda" ? " panel-contenido--ancho" : modulo === "mi-sitio" ? " panel-contenido--editor" : ""}`}
      role="status"
      aria-label={`Cargando ${nombres[modulo] ?? "contenido"}`}
      aria-busy="true"
      data-testid="skeleton-panel"
      data-modulo={modulo}
    >
      <EsperaVista />
      <div aria-hidden="true">
        <div className="skeleton skeleton--titulo" />
        {modulo === "resumen" ? (
          <>
            <div className="skeleton-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton skeleton--metrica" />
              ))}
            </div>
            <div className="panel-grilla">
              <div className="skeleton skeleton--modulo" />
              <div className="skeleton skeleton--modulo" />
            </div>
          </>
        ) : modulo === "mi-sitio" ? (
          <div className="skeleton-editor">
            <div className="skeleton skeleton--modulo" />
            <div className="skeleton skeleton--modulo" />
          </div>
        ) : (
          <>
            <div className="skeleton skeleton--filtros" />
            {modulo === "facturacion" && (
              <div className="skeleton-grid">
                <div className="skeleton skeleton--metrica" />
                <div className="skeleton skeleton--metrica" />
              </div>
            )}
            <div
              className={`skeleton skeleton--${modulo === "agenda" ? "calendario" : modulo === "configuracion" ? "modulo" : "tabla"}`}
            />
          </>
        )}
      </div>
    </div>
  );
}
