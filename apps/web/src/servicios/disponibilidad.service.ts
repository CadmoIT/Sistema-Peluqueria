/** Convierte horarios locales y comprueba jornadas respetando la zona del negocio. */
export type Jornada = {
  diaSemana: number;
  comienza: string;
  termina: string;
};

export function estaDentroDelHorario(
  inicio: Date,
  fin: Date,
  horarios: Jornada[],
  zonaHoraria: string,
) {
  if (!horarios.length) return false;
  const inicioLocal = partesLocales(inicio, zonaHoraria);
  const finLocal = partesLocales(fin, zonaHoraria);
  if (inicioLocal.diaSemana !== finLocal.diaSemana) return false;
  return horarios.some(
    (horario) =>
      horario.diaSemana === inicioLocal.diaSemana &&
      horario.comienza <= inicioLocal.hora &&
      horario.termina >= finLocal.hora,
  );
}

export function fechaLocalAUtc(
  fecha: string,
  hora: string,
  zonaHoraria: string,
) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const estimada = Date.UTC(anio!, mes! - 1, dia!, horas!, minutos!);
  let resultado = estimada;

  // Dos pasadas cubren cambios de huso y horario de verano sin fijar UTC-3.
  for (let intento = 0; intento < 2; intento += 1) {
    const local = partesFecha(new Date(resultado), zonaHoraria);
    const representacionLocal = Date.UTC(
      local.anio,
      local.mes - 1,
      local.dia,
      local.horas,
      local.minutos,
    );
    resultado -= representacionLocal - estimada;
  }

  return new Date(resultado);
}

export function sumarDias(fecha: string, cantidad: number) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const resultado = new Date(Date.UTC(anio!, mes! - 1, dia! + cantidad));
  return resultado.toISOString().slice(0, 10);
}

export function diaSemanaLocal(fecha: string, zonaHoraria: string) {
  return partesLocales(fechaLocalAUtc(fecha, "12:00", zonaHoraria), zonaHoraria)
    .diaSemana;
}

function partesLocales(fecha: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  const dias: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    diaSemana: dias[valor("weekday")] ?? -1,
    hora: `${valor("hour")}:${valor("minute")}`,
  };
}

function partesFecha(fecha: Date, zonaHoraria: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const numero = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);
  return {
    anio: numero("year"),
    mes: numero("month"),
    dia: numero("day"),
    horas: numero("hour"),
    minutos: numero("minute"),
  };
}
