/** Configura descuentos y recargos por servicio con el precio final a la vista. */
"use client";
import { useState } from "react";
import {
  precioServicio,
  type AjustePago,
  type MediosPagoServicio as Config,
} from "@/lib/precios-medios";
const medios = [
  ["EFECTIVO", "Efectivo"],
  ["TARJETA_EXTERNA", "Tarjeta"],
  ["MERCADO_PAGO", "Mercado Pago"],
] as const;
export function MediosPagoServicio({
  precio,
  inicial,
}: {
  precio: number;
  inicial?: Config;
}) {
  const [reglas, cambiar] = useState<Config>(inicial ?? {});
  function actualizar(medio: string, cambio: Partial<AjustePago>) {
    cambiar((actual) => ({
      ...actual,
      [medio]: {
        tipo: "SIN_AJUSTE",
        unidad: "PORCENTAJE",
        valor: 0,
        ...actual[medio],
        ...cambio,
      },
    }));
  }
  return (
    <fieldset className="selector-multiple medios-pago-servicio">
      <legend>Medios de pago</legend>
      <input type="hidden" name="mediosPago" value={JSON.stringify(reglas)} />
      {medios.map(([medio, nombre]) => {
        const regla = reglas[medio] ?? {
          tipo: "SIN_AJUSTE",
          unidad: "PORCENTAJE",
          valor: 0,
        };
        let final = "Revisá el descuento";
        try {
          final = new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
          }).format(Number(precioServicio(precio || 0, medio, reglas)));
        } catch {
          /* El servidor valida antes de guardar. */
        }
        return (
          <div className="medio-pago-servicio" key={medio}>
            <header>
              <strong>{nombre}</strong>
              <output>{final}</output>
            </header>
            <label>
              Ajuste
              <select
                aria-label={`Ajuste ${nombre}`}
                value={regla.tipo}
                onChange={(e) =>
                  actualizar(medio, {
                    tipo: e.target.value as AjustePago["tipo"],
                  })
                }
              >
                <option value="SIN_AJUSTE">Sin ajuste</option>
                <option value="DESCUENTO">Descuento</option>
                <option value="RECARGO">Recargo</option>
              </select>
            </label>
            {regla.tipo !== "SIN_AJUSTE" && (
              <>
                <div className="form-grid">
                  <label>
                    Valor
                    <input
                      aria-label={`Valor ${nombre}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={regla.valor}
                      onChange={(e) =>
                        actualizar(medio, { valor: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Unidad
                    <select
                      aria-label={`Unidad ${nombre}`}
                      value={regla.unidad}
                      onChange={(e) =>
                        actualizar(medio, {
                          unidad: e.target.value as AjustePago["unidad"],
                        })
                      }
                    >
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="PESOS">Pesos ($)</option>
                    </select>
                  </label>
                </div>
                <div className="acciones-seccion">
                  {[5, 10].map((valor) => (
                    <button
                      type="button"
                      className="boton boton--secundario"
                      key={valor}
                      onClick={() =>
                        actualizar(medio, { valor, unidad: "PORCENTAJE" })
                      }
                    >
                      {valor}%
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
