/** Presenta nombre completo y contacto opcional en campos apilados y accesibles. */
import type { DatosCliente } from "@/lib/clientes-archivo";
export function CamposCliente({ cliente }: { cliente?: DatosCliente }) {
  return (
    <div className="campos-cliente">
      {(
        [
          ["nombre", "Nombre", "ana", "text", "name"],
          ["email", "Email", "email@ejemplo.com.ar", "email", "email"],
          ["telefono", "Teléfono", "11 12345678", "tel", "tel"],
        ] as const
      ).map(([nombre, etiqueta, ejemplo, tipo, completar]) => (
        <label className="campo-cliente" key={nombre}>
          <span>{etiqueta}</span>
          <input
            name={nombre}
            type={tipo}
            aria-label={etiqueta}
            placeholder={ejemplo}
            autoComplete={completar}
            defaultValue={nombre === "nombre" ? [cliente?.nombre, cliente?.apellido].filter(Boolean).join(" ") : cliente?.[nombre] ?? ""}
          />
        </label>
      ))}
    </div>
  );
}
