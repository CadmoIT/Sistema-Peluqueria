/** Regla compartida de precios: sólo los servicios reciben descuento en efectivo. */
import { Prisma } from "@prisma/client";
export const MEDIOS = [
  "EFECTIVO",
  "TARJETA_EXTERNA",
  "MERCADO_PAGO",
  "TRANSFERENCIA",
] as const;
export function medioValido(medio: string) {
  if (!(MEDIOS as readonly string[]).includes(medio))
    throw new Error("Elegí un medio de pago válido.");
  return medio;
}
export function descuentoNegocio(config: unknown): number {
  const d = (config as { descuentoEfectivo?: unknown } | null)
    ?.descuentoEfectivo;
  return typeof d === "number" && Number.isFinite(d) && d >= 0 && d <= 99
    ? d
    : 0;
}
export function precioMedio(
  base: Prisma.Decimal | number | string,
  medio: string,
  descuento: number,
) {
  medioValido(medio);
  if (!Number.isFinite(descuento) || descuento < 0 || descuento > 99)
    throw new Error("Descuento inválido.");
  return new Prisma.Decimal(base)
    .mul(
      medio === "EFECTIVO"
        ? new Prisma.Decimal(100).minus(descuento).div(100)
        : 1,
    )
    .toDecimalPlaces(2);
}
export function acuerdoCobro(
  base: Prisma.Decimal,
  medio: string,
  descuento: number,
  anterior?: {
    medio: string;
    precioBase: Prisma.Decimal | null;
    totalAcordado: Prisma.Decimal | null;
    descuentoEfectivo: Prisma.Decimal | null;
  },
) {
  medioValido(medio);
  if (anterior && (anterior.medio === "EFECTIVO") !== (medio === "EFECTIVO"))
    throw new Error(
      "Este turno ya tiene cobros con otro precio. El dueño debe corregirlos antes de cambiar el medio.",
    );
  const porcentaje = anterior
    ? Number(anterior.descuentoEfectivo ?? 0)
    : medio === "EFECTIVO"
      ? descuento
      : 0;
  return {
    base: anterior?.precioBase ?? base,
    descuento: porcentaje,
    total:
      anterior?.totalAcordado ??
      (anterior ? base : precioMedio(base, medio, porcentaje)),
  };
}
