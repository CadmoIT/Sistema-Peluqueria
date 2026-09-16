/** Agrupa dinero real por hora o fecha usando la zona horaria del negocio. */
import { fechaLocalAUtc, sumarDias } from "../servicios/disponibilidad.service";
export type PeriodoReporte = "dia" | "semana" | "mes";
export type IntervaloReporte = { clave: string; etiqueta: string; ingresos: number; egresos: number; saldo: number };
function fechaLocal(fecha: Date, zona: string) { const p = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(fecha); const leer = (t: string) => p.find((v) => v.type === t)?.value; return `${leer("year")}-${leer("month")}-${leer("day")}`; }
export function periodoReporte(entrada: string | undefined): PeriodoReporte { return entrada === "dia" || entrada === "semana" ? entrada : "mes"; }
export function rangoReporte(periodo: PeriodoReporte, zona: string, ahora = new Date()) {
  const hoy = fechaLocal(ahora, zona), dia = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const fecha = periodo === "dia" ? hoy : periodo === "semana" ? sumarDias(hoy, -((dia + 6) % 7)) : `${hoy.slice(0, 7)}-01`;
  const siguiente = periodo === "dia" ? sumarDias(fecha, 1) : periodo === "semana" ? sumarDias(fecha, 7) : new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)), 1)).toISOString().slice(0, 10);
  return { fecha, siguiente, desde: fechaLocalAUtc(fecha, "00:00", zona), hasta: fechaLocalAUtc(siguiente, "00:00", zona) };
}
export function agruparMovimientos(movimientos: Array<{ creadoEn: Date; tipo: string; monto: unknown }>, periodo: PeriodoReporte, zona: string, ahora = new Date()): IntervaloReporte[] {
  const rango = rangoReporte(periodo, zona, ahora), claves: string[] = [];
  if (periodo === "dia") for (let h = 0; h < 24; h++) claves.push(`${String(h).padStart(2, "0")}:00`);
  else for (let fecha = rango.fecha; fecha < rango.siguiente; fecha = sumarDias(fecha, 1)) claves.push(fecha);
  const grupos = new Map(claves.map((clave) => [clave, { clave, etiqueta: periodo === "dia" ? clave : new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${clave}T12:00:00Z`)), ingresos: 0, egresos: 0, saldo: 0 }]));
  for (const m of movimientos) {
    if (m.creadoEn < rango.desde || m.creadoEn >= rango.hasta || !["INGRESO", "EGRESO"].includes(m.tipo)) continue;
    const clave = periodo === "dia" ? `${new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", hourCycle: "h23" }).format(m.creadoEn)}:00` : fechaLocal(m.creadoEn, zona);
    const grupo = grupos.get(clave); if (!grupo) continue;
    const monto = Number(m.monto); if (!Number.isFinite(monto)) continue;
    if (m.tipo === "INGRESO") grupo.ingresos += monto; else grupo.egresos += monto;
    grupo.saldo = grupo.ingresos - grupo.egresos;
  }
  return [...grupos.values()];
}
