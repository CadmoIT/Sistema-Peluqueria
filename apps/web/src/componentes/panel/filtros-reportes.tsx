/** Actualiza filtros de reportes en la URL sin botón Aplicar ni recarga completa. */
"use client";
import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
type Opcion = { id: string; nombre: string };
export function FiltrosReportes({ periodo, local, atribucion, sedes, profesionales }: { periodo: string; local: string; atribucion: string; sedes: Opcion[]; profesionales: Opcion[] }) {
  const router = useRouter(), params = useSearchParams(), [pendiente, iniciar] = useTransition();
  function cambiar(campo: string, valor: string) { const query = new URLSearchParams(params.toString()); if (valor) query.set(campo, valor); else query.delete(campo); iniciar(() => router.replace(`/panel/reportes?${query}`, { scroll: false })); }
  return <><div className="herramientas-modulo reportes-filtros" aria-busy={pendiente}>
    <label className="filtro-discreto">Período<select aria-label="Período del reporte" value={periodo} onChange={(e) => cambiar("periodo", e.target.value)}><option value="dia">Hoy</option><option value="semana">Semana</option><option value="mes">Mes</option></select></label>
    {sedes.length > 1 && <label className="filtro-discreto">Local<select aria-label="Local del reporte" value={local} onChange={(e) => cambiar("local", e.target.value)}><option value="">Todos los locales</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
    <label className="filtro-discreto">Atribución<select aria-label="Profesional o atribución" value={atribucion} onChange={(e) => cambiar("profesional", e.target.value)}><option value="">Todos</option><option value="local">Local</option>{profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}<option value="sin-asignar">Sin asignar</option><option value="eliminado">Profesional eliminado</option></select></label>
  </div>{pendiente && <div className="reportes-cargando" role="status"><span className="solo-lectores">Actualizando reporte</span><div className="skeleton skeleton--tabla" /></div>}</>;
}
