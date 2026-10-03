/** Presenta las sucursales activas antes de abrir la agenda correspondiente. */
import { MapPin, ArrowRight } from "lucide-react";
import { enlaceSitioPublico } from "@/lib/dominios-publicos";
import "./selector-sucursales.css";

export function SelectorSucursales({
  nombre,
  slug,
  sedes,
  profesionalInicial = "",
}: {
  nombre: string;
  slug: string;
  sedes: readonly { id: string; nombre: string; direccion: string }[];
  profesionalInicial?: string;
}) {
  return (
    <main className="selector-sucursales">
      <span className="selector-sucursales__etiqueta">
        RESERVÁ TU PRÓXIMO TURNO
      </span>
      <h1>{nombre}</h1>
      <p>Elegí la sucursal que te quede más cerca.</p>
      <div className="selector-sucursales__lista">
        {sedes.map((sede) => (
          <a
            key={sede.id}
            href={
              enlaceSitioPublico(slug, sede.id) +
              (profesionalInicial
                ? `?profesional=${encodeURIComponent(profesionalInicial)}`
                : "")
            }
            className="selector-sucursales__tarjeta"
          >
            <MapPin aria-hidden="true" />
            <div>
              <h2>{sede.nombre}</h2>
              <p>
                {sede.direccion || "Consultá la información de esta sucursal"}
              </p>
            </div>
            <ArrowRight aria-hidden="true" />
          </a>
        ))}
      </div>
      {!sedes.length && <p>Por el momento no hay sucursales disponibles.</p>}
    </main>
  );
}
