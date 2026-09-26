const ESPERA_ENTRE_INTENTOS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
];

export const MAX_INTENTOS_ENTREGA = ESPERA_ENTRE_INTENTOS_MS.length + 1;

export function proximoIntento(attempts: number, now = new Date()) {
  const espera = ESPERA_ENTRE_INTENTOS_MS[Math.max(0, attempts - 1)];
  return espera === undefined ? null : new Date(now.getTime() + espera);
}
