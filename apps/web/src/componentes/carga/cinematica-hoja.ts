/** Modela el agarre de la esquina inferior derecha, la curvatura y el paso detrás de los aros. */
export const duracionGiroHoja = 1000;

export function calcularHojaCurvada(progreso: number) {
  const p = Math.max(0, Math.min(1, progreso));
  const agarre = Math.min(1, p / 0.35);
  const curva = 96 * (1 - (1 - agarre) ** 2) * (1 - p * 0.2);
  const giro = Math.max(0, (p - 0.18) / 0.82);
  const suavizado = giro * giro * (3 - 2 * giro);
  const angulo = 190 * suavizado;
  const torsion = Math.sin(Math.PI * p) * (1 - giro);
  const a = `207 ${203 - curva}`;
  const b = `${207 - curva} 203`;
  const esquina = `${207 - curva * 0.8} ${203 - curva * 0.88}`;
  const frente =
    curva < 0.01
      ? "M13 1H195Q207 1 207 13V191Q207 203 195 203H13Q1 203 1 191V13Q1 1 13 1Z"
      : `M13 1H195Q207 1 207 13V${203 - curva}Q${207 - curva * 0.38} ${203 - curva * 0.38} ${b}H13Q1 203 1 191V13Q1 1 13 1Z`;
  return {
    frente,
    pliegue: `M${a}Q${207 - curva * 0.07} ${203 - curva * 0.76} ${esquina}Q${207 - curva * 0.96} ${203 - curva * 0.5} ${b}Q${207 - curva * 0.38} ${203 - curva * 0.38} ${a}Z`,
    borde: `M${a}Q${207 - curva * 0.07} ${203 - curva * 0.76} ${esquina}Q${207 - curva * 0.96} ${203 - curva * 0.5} ${b}`,
    reverso: angulo >= 88,
    transform: `translateZ(${Math.sin(Math.PI * giro) * 24}px) rotateX(${angulo}deg) rotateY(${-14 * torsion}deg) rotateZ(${-3 * torsion}deg)`,
  };
}
