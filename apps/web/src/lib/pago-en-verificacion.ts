/** Distingue una operación de pago registrada de un checkout solamente abierto. */
export function hayPagoEnVerificacion(
  suscripcion: { id: string; planPendiente: string | null } | null,
  pagos: readonly { suscripcionId: string | null; proveedorId: string | null; plan: string | null; estado: string }[],
) {
  if (!suscripcion?.planPendiente) return false;
  return pagos.some((pago) =>
    pago.suscripcionId === suscripcion.id &&
    Boolean(pago.proveedorId) &&
    pago.plan === suscripcion.planPendiente &&
    ["PENDIENTE", "EN_PROCESO", "APROBADO"].includes(pago.estado),
  );
}
