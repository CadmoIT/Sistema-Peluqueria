/** Calcula precios decimales por servicio y medio, conservando acuerdos históricos. */
import { Prisma } from "@prisma/client";
export type AjustePago = {
  tipo: "SIN_AJUSTE" | "DESCUENTO" | "RECARGO";
  unidad: "PORCENTAJE" | "PESOS";
  valor: number;
};
export type MediosPagoServicio = Record<string, AjustePago>;
export function validarMediosServicio(entrada: unknown): MediosPagoServicio {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    throw new Error("Medios de pago inválidos.");
  const resultado: MediosPagoServicio = {};
  for (const [medio, regla] of Object.entries(entrada)) {
    medioValido(medio);
    const r = regla as AjustePago;
    if (
      !r ||
      !["SIN_AJUSTE", "DESCUENTO", "RECARGO"].includes(r.tipo) ||
      !["PORCENTAJE", "PESOS"].includes(r.unidad) ||
      typeof r.valor !== "number" ||
      !Number.isFinite(r.valor) ||
      r.valor < 0 ||
      (r.tipo === "DESCUENTO" && r.unidad === "PORCENTAJE" && r.valor > 100)
    )
      throw new Error("Ajuste de pago inválido.");
    resultado[medio] = {
      tipo: r.tipo,
      unidad: r.unidad,
      valor: r.tipo === "SIN_AJUSTE" ? 0 : r.valor,
    };
  }
  return resultado;
}
export function precioServicio(
  base: Prisma.Decimal | number | string,
  medio: string,
  config: unknown,
  descuentoAnterior = 0,
) {
  const reglas = config == null ? null : validarMediosServicio(config);
  const regla = reglas?.[medio];
  if (!regla) return precioMedio(base, medio, reglas ? 0 : descuentoAnterior);
  medioValido(medio);
  const original = new Prisma.Decimal(base);
  const ajuste =
    regla.tipo === "SIN_AJUSTE"
      ? new Prisma.Decimal(0)
      : regla.unidad === "PESOS"
        ? new Prisma.Decimal(regla.valor)
        : original.mul(regla.valor).div(100);
  const total =
    regla.tipo === "DESCUENTO" ? original.minus(ajuste) : original.plus(ajuste);
  if (total.lt(0))
    throw new Error("El descuento supera el precio del servicio.");
  return total.toDecimalPlaces(2);
}
export function precioReservaMedio(
  base: Prisma.Decimal,
  lineas: Array<{ precio: Prisma.Decimal; servicio: { mediosPago: unknown } }>,
  medio: string,
  descuentoAnterior = 0,
) {
  const total = lineas.reduce(
    (s, l) =>
      s.plus(
        precioServicio(
          l.precio,
          medio,
          l.servicio.mediosPago,
          descuentoAnterior,
        ).minus(l.precio),
      ),
    base,
  );
  if (total.lt(0)) throw new Error("El ajuste supera el precio del turno.");
  return total.toDecimalPlaces(2);
}
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
  if (anterior && anterior.medio !== medio)
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
