/** Termina el giro en curso al cargar la vista y confirma sin recorrer meses innecesarios. */
export type TiempoCalendario = {
  instante: number;
  destino: number | null;
  confirmacion: number | null;
};

export function avanzarCalendario(
  anterior: TiempoCalendario,
  delta: number,
  listo: boolean,
): TiempoCalendario {
  const paso = Math.min(64, Math.max(0, delta));
  if (anterior.confirmacion !== null)
    return { ...anterior, confirmacion: anterior.confirmacion + paso };
  // Acabar la hoja ya levantada evita cortarla o devolverla bruscamente al frente.
  const destino =
    anterior.destino ??
    (listo ? Math.ceil(anterior.instante / 500) * 500 : null);
  const instante =
    destino === null
      ? anterior.instante + paso
      : Math.min(destino, anterior.instante + paso);
  return {
    instante,
    destino,
    confirmacion: destino !== null && instante >= destino ? 0 : null,
  };
}
