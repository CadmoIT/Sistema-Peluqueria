/** Muestra compras con búsqueda, filtro por local y columnas configurables. */
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { EditorTablaCompras } from "./editor-tabla-compras";
import { nombresColumnasCompras } from "@/lib/columnas-compras";

type CompraFila = {
  id: string;
  creadoEn: string;
  proveedor: string | null;
  sedeId: string;
  sedeNombre: string;
  items: Array<{ id: string; nombre: string; cantidad: number }>;
  total: number;
};
type Sede = { id: string; nombre: string };

export function TablaCompras({ compras, sedes, columnas }: { compras: CompraFila[]; sedes: Sede[]; columnas: string[] }) {
  const [buscar, cambiarBuscar] = useState("");
  const [local, cambiarLocal] = useState(sedes[0]?.id ?? "");
  useEffect(() => {
    if (local && !sedes.some((sede) => sede.id === local)) cambiarLocal(sedes[0]?.id ?? "");
  }, [local, sedes]);
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visibles = compras.filter((compra) => (!local || compra.sedeId === local) && normalizar(`${compra.proveedor ?? ""} ${compra.sedeNombre} ${compra.items.map((item) => item.nombre).join(" ")}`).includes(normalizar(buscar)));
  return <>
    <div className="herramientas-modulo compras-herramientas">
      <label className="buscador-panel">
        <Search />
        <input aria-label="Buscar compras" placeholder="Buscar compras" value={buscar} onChange={(evento) => cambiarBuscar(evento.target.value)} />
      </label>
      {sedes.length > 1 && <label className="filtro-discreto">Local<select aria-label="Filtrar compras por local" value={local} onChange={(evento) => cambiarLocal(evento.target.value)}><option value="">Todos los locales</option>{sedes.map((sede) => <option value={sede.id} key={sede.id}>{sede.nombre}</option>)}</select></label>}
      <EditorTablaCompras columnas={columnas} variosLocales={sedes.length > 1} />
    </div>
    {!visibles.length ? <p className="sin-resultados">{buscar ? "No encontramos compras con esa búsqueda." : "Todavía no hay compras para este local."}</p> : <div className="tabla-abierta compras-tabla"><table><thead><tr>{columnas.map((columna) => <th className={columna === "total" || columna === "local" ? "compras-columna--centrada" : undefined} key={columna} scope="col">{nombresColumnasCompras[columna]}</th>)}</tr></thead><tbody>{visibles.map((compra) => <tr key={compra.id}>{columnas.map((columna) => <td className={columna === "total" || columna === "local" ? "compras-columna--centrada" : undefined} key={columna}>{valorColumna(columna, compra)}</td>)}</tr>)}</tbody></table></div>}
  </>;
}

function valorColumna(columna: string, compra: CompraFila) {
  if (columna === "fecha") return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(compra.creadoEn));
  if (columna === "proveedor") return compra.proveedor || "Sin proveedor";
  if (columna === "local") return compra.sedeNombre;
  if (columna === "productos") return compra.items.map((item) => `${item.nombre} × ${item.cantidad}`).join(", ");
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(compra.total);
}
