/** Edita ajustes firmados por medio sin perder reglas guardadas ni importes históricos. */
"use client";
import React, { useState } from "react";
import {
  precioServicio,
  ajusteFirmado,
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
  const [textos, setTextos] = useState<Record<string, string>>({});
  function actualizar(
    medio: string,
    valor: number,
    unidad: AjustePago["unidad"],
  ) {
    cambiar((actual) => ({ ...actual, [medio]: ajusteFirmado(valor, unidad) }));
  }
  let error = "";
  try {
    for (const [medio] of medios) precioServicio(precio || 0, medio, reglas);
  } catch {
    error = "El descuento no puede superar el precio.";
  }
  return (
    <fieldset className="medios-pago-servicio">
      <legend>Medios de pago</legend>
      <input type="hidden" name="mediosPago" value={JSON.stringify(reglas)} />
      {medios.map(([medio, nombre]) => {
        const regla = reglas[medio] ?? {
          tipo: "SIN_AJUSTE",
          unidad: "PORCENTAJE",
          valor: 0,
        };
        const valor =
          regla.tipo === "DESCUENTO"
            ? -regla.valor
            : regla.tipo === "RECARGO"
              ? regla.valor
              : 0;
        return (
          <div className="medio-pago-servicio" key={medio}>
            <strong>{nombre}</strong>
            <label>
              <span>Ajuste</span>
              <input
                aria-label={`Ajuste ${nombre}`}
                type="text"
                inputMode="decimal"
                pattern="(\+|-)?([0-9]+([.,][0-9]+)?|[.,][0-9]+)"
                required
                value={textos[medio] ?? String(valor)}
                onChange={(e) => {
                  const texto = e.target.value;
                  setTextos((actual) => ({ ...actual, [medio]: texto }));
                  const numero = Number(texto.replace(",", "."));
                  if (texto.trim() && Number.isFinite(numero))
                    actualizar(medio, numero, regla.unidad);
                }}
              />
            </label>
            <select
              aria-label={`Unidad ${nombre}`}
              value={regla.unidad}
              onChange={(e) =>
                actualizar(medio, valor, e.target.value as AjustePago["unidad"])
              }
            >
              <option value="PORCENTAJE">%</option>
              <option value="PESOS">$</option>
            </select>
          </div>
        );
      })}
      <small>− descuenta · + recarga · 0 sin ajuste</small>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
