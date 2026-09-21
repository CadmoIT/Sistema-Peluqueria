/** Actualiza filtros de reportes en la URL sin botón Aplicar ni recarga completa. */
"use client";
import { ChevronDown } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";
import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
type Opcion = { id: string; nombre: string };
export function FiltrosReportes({ periodo, local, atribucion, sedes, profesionales }: { periodo: string; local: string; atribucion: string; sedes: Opcion[]; profesionales: Opcion[] }) {
  const router = useRouter(), params = useSearchParams(), [pendiente, iniciar] = useTransition();
  function cambiar(campo: string, valor: string) { const query = new URLSearchParams(params.toString()); if (valor) query.set(campo, valor); else query.delete(campo); iniciar(() => router.replace(`/panel/reportes?${query}`, { scroll: false })); }
  return <><div className="herramientas-modulo reportes-filtros" aria-busy={pendiente}>
    <label className="filtro-discreto">Período<FiltroSelect ariaLabel="Período del reporte" value={periodo} onChange={(e) => cambiar("periodo", e.target.value)}><option value="dia">Hoy</option><option value="semana">Semana</option><option value="mes">Mes</option></FiltroSelect></label>
    {sedes.length > 1 && <label className="filtro-discreto">Local<FiltroSelect ariaLabel="Local del reporte" value={local} onChange={(e) => cambiar("local", e.target.value)}><option value="">Todos los locales</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</FiltroSelect></label>}
    <label className="filtro-discreto">Atribución<FiltroSelect ariaLabel="Profesional o atribución" value={atribucion} onChange={(e) => cambiar("profesional", e.target.value)}><option value="">Todos</option><option value="local">Local</option>{profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}<option value="sin-asignar">Sin asignar</option><option value="eliminado">Profesional eliminado</option></FiltroSelect></label>
  </div>{pendiente && <div className="reportes-cargando" role="status"><span className="solo-lectores">Actualizando reporte</span><div className="skeleton skeleton--tabla" /></div>}</>;
}

function FiltroSelect({ ariaLabel, value, onChange, children }: { ariaLabel: string; value: string; onChange: ChangeEventHandler<HTMLSelectElement>; children: ReactNode }) {
  return <span className="filtro-select-control"><select aria-label={ariaLabel} value={value} onChange={onChange}>{children}</select><ChevronDown aria-hidden size={16} /></span>;
}
