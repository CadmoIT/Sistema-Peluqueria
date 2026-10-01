/** Evita solapamientos locales; los reclamos PostgreSQL protegen entre workers. */
export function crearSondeoDurable(procesar: () => Promise<void>, reportar: (error: unknown) => void) {
  let enCurso = false;
  return async () => {
    if (enCurso) return;
    enCurso = true;
    try { await procesar(); }
    catch (error) { reportar(error); }
    finally { enCurso = false; }
  };
}
