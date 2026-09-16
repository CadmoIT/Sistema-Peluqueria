/** Define fechas, estados y jornadas compartidas por la agenda diaria. */
import { sumarDias } from "@/servicios/disponibilidad.service";

export type EventoAgenda = {
  id: string;
  title: string;
  start: string;
  end: string;
  editable: boolean;
  tipo: "reserva" | "google" | "bloqueo";
  estado: string;
  cliente: string;
  servicio: string;
  profesionalId: string;
  profesional: string;
  sedeId: string;
  sede: string;
};
export type ProfesionalAgenda = {
  id: string;
  nombre: string;
  localesIds?: string[];
  horarios: Array<{
    sedeId: string;
    diaSemana: number;
    comienza: string;
    termina: string;
  }>;
};
export type LocalAgenda = {
  id: string;
  nombre: string;
  horarios: Array<{
    diaSemana: number;
    abre: string;
    cierra: string;
    activo: boolean;
  }>;
};
export const ESTADOS_AGENDA = [
  {
    id: "CONFIRMADA",
    nombre: "Confirmado",
    color: "#207345",
    fondo: "#e8f5ec",
    estados: ["CONFIRMADA"],
  },
  {
    id: "PENDIENTE",
    nombre: "Pendiente",
    color: "#865500",
    fondo: "#fff4d6",
    estados: ["BORRADOR", "RETENIDA", "PENDIENTE_PAGO"],
  },
  {
    id: "COMPLETADA",
    nombre: "Completado",
    color: "#126783",
    fondo: "#e8f3f7",
    estados: ["COMPLETADA"],
  },
  {
    id: "AUSENTE",
    nombre: "Ausente",
    color: "#a22d32",
    fondo: "#fceced",
    estados: ["AUSENTE"],
  },
  {
    id: "CANCELADA",
    nombre: "Cancelado / vencido",
    color: "#595959",
    fondo: "#f0f0f0",
    estados: ["CANCELADA", "VENCIDA"],
  },
  {
    id: "OCUPADO",
    nombre: "Ocupado / bloqueado",
    color: "#75459a",
    fondo: "#f1eaf8",
    estados: ["OCUPADO"],
  },
];
export function grupoEstado(estado: string) {
  return (
    ESTADOS_AGENDA.find((grupo) => grupo.estados.includes(estado)) ??
    ESTADOS_AGENDA[1]!
  );
}
export function fechaValida(fecha: string | undefined): fecha is string {
  return Boolean(
    fecha &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(fecha)) &&
    new Date(fecha).toISOString().slice(0, 10) === fecha,
  );
}
export function fechaEnZona(fecha: Date, zona: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const leer = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${leer("year")}-${leer("month")}-${leer("day")}`;
}
export function fechaVisual(iso: string, zona: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const leer = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${leer("year")}-${leer("month")}-${leer("day")}T${leer("hour")}:${leer("minute")}:00Z`;
}
export function semanaDe(fecha: string) {
  const dia = new Date(fecha + "T12:00:00Z").getUTCDay();
  const lunes = sumarDias(fecha, -((dia + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}
export function cincoDiasDesde(fecha: string) {
  return Array.from({ length: 5 }, (_, i) => sumarDias(fecha, i));
}
export function jornadasDelDia(
  fecha: string,
  persona: ProfesionalAgenda,
  locales: LocalAgenda[],
) {
  const dia = new Date(fecha + "T12:00:00Z").getUTCDay();
  return locales
    .filter(
      (l) => !persona.localesIds?.length || persona.localesIds.includes(l.id),
    )
    .flatMap((local) =>
      local.horarios
        .filter((h) => h.activo && h.diaSemana === dia)
        .flatMap((h) => {
          const asignados = persona.horarios.filter(
            (j) => j.sedeId === local.id,
          );
          if (!asignados.length) return [{ abre: h.abre, cierra: h.cierra }];
          return asignados
            .filter((j) => j.diaSemana === dia)
            .map((j) => ({
              abre: j.comienza > h.abre ? j.comienza : h.abre,
              cierra: j.termina < h.cierra ? j.termina : h.cierra,
            }))
            .filter((j) => j.abre < j.cierra);
        }),
    );
}
export function rangoDelDia(
  fecha: string,
  personas: ProfesionalAgenda[],
  locales: LocalAgenda[],
  eventos: EventoAgenda[],
  zona: string,
) {
  const jornadas = personas.flatMap((p) => jornadasDelDia(fecha, p, locales));
  const minutos = (hora: string) =>
    Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
  const horarios = jornadas.flatMap((j) => [
    minutos(j.abre),
    minutos(j.cierra),
  ]);
  for (const e of eventos) {
    if (
      fechaEnZona(new Date(e.start), zona) <= fecha &&
      fechaEnZona(new Date(e.end), zona) >= fecha
    ) {
      horarios.push(
        fechaEnZona(new Date(e.start), zona) < fecha
          ? 0
          : minutos(fechaVisual(e.start, zona).slice(11, 16)),
      );
      horarios.push(
        fechaEnZona(new Date(e.end), zona) > fecha
          ? 1440
          : minutos(fechaVisual(e.end, zona).slice(11, 16)),
      );
    }
  }
  const texto = (valor: number) =>
    `${String(Math.floor(valor / 60)).padStart(2, "0")}:${String(valor % 60).padStart(2, "0")}:00`;
  return {
    minimo: texto(
      horarios.length ? Math.max(0, Math.min(...horarios) - 30) : 480,
    ),
    maximo: texto(
      horarios.length ? Math.min(1440, Math.max(...horarios) + 30) : 1200,
    ),
    cerrado: !jornadas.length,
  };
}
