type Recurso = { id?: string | number; preapproval_id?: string | number };
type Factura = Recurso & { payment?: { id?: string | number } };

/** La factura consultada en MP es la fuente de la relación con la suscripción. */
export function vincularPagoSuscripcion<T extends Recurso>(pago: T, factura: Factura): T {
  if (!factura.preapproval_id || !factura.payment?.id || pago.id === undefined) {
    throw new Error("La factura recurrente no incluye una relación de pago y suscripción completa.");
  }
  if (String(factura.payment.id) !== String(pago.id)) {
    throw new Error("El pago consultado no coincide con el pago de la factura recurrente.");
  }
  if (pago.preapproval_id && String(pago.preapproval_id) !== String(factura.preapproval_id)) {
    throw new Error("La suscripción del pago no coincide con la factura recurrente.");
  }
  return { ...pago, preapproval_id: String(factura.preapproval_id) };
}
