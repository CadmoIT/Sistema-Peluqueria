/** Autoriza únicamente la reversión inmediata de la venta registrada por el actor. */
export function validarDeshacerVenta(
  venta: {
    actorUsuarioId: string | null;
    anuladoEn: Date | null;
    deshacerHasta: Date | null;
  } | null,
  actor: string,
  ahora = Date.now(),
) {
  if (!venta || venta.actorUsuarioId !== actor)
    throw new Error("La venta no pertenece a tu cuenta.");
  if (venta.anuladoEn) return false;
  if (!venta.deshacerHasta || ahora > venta.deshacerHasta.getTime())
    throw new Error(
      "Terminó el plazo para deshacer. Pedile al dueño que anule la venta.",
    );
  return true;
}
