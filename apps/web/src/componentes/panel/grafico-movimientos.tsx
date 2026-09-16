/** Expone importes agrupados con un tooltip accesible al apuntar, enfocar o tocar. */
"use client";
import { useEffect, useState } from "react";
import type { IntervaloReporte } from "@/lib/reportes-movimientos";
const pesos = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
export function GraficoMovimientos({ intervalos }: { intervalos: IntervaloReporte[] }) {
  const [listo, habilitar] = useState(false);
  useEffect(() => habilitar(true), []);
  const [activo, seleccionar] = useState<string | null>(null), maximo = Math.max(1, ...intervalos.flatMap((i) => [i.ingresos, i.egresos]));
  return <div className="grafico-intervalos" aria-label="Movimientos de caja por intervalo">{intervalos.map((i) => <div className="grafico-intervalo" key={i.clave}>
    <button type="button" disabled={!listo} className="grafico-intervalo__barra" aria-label={`${i.etiqueta}. Ingresos ${pesos(i.ingresos)}, egresos ${pesos(i.egresos)}, saldo ${pesos(i.saldo)}`} aria-describedby={activo === i.clave ? `importe-${i.clave}` : undefined} onMouseEnter={() => seleccionar(i.clave)} onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) seleccionar(null); }} onFocus={() => seleccionar(i.clave)} onBlur={() => seleccionar(null)} onClick={() => seleccionar(activo === i.clave ? null : i.clave)}>
      <span className="barra-ingreso" style={{ height: `${(i.ingresos / maximo) * 100}%` }} /><span className="barra-egreso" style={{ height: `${(i.egresos / maximo) * 100}%` }} />
    </button><span className="grafico-etiqueta">{i.etiqueta}</span>{activo === i.clave && <div className="grafico-tooltip" role="tooltip" id={`importe-${i.clave}`}><strong>{i.etiqueta}</strong><span>Ingresos: {pesos(i.ingresos)}</span><span>Egresos: {pesos(i.egresos)}</span><span>Saldo: {pesos(i.saldo)}</span></div>}
  </div>)}</div>;
}
