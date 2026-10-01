/** Franja compacta con reloj local y enlace a facturación. */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import { avisoSuscripcion } from "@turnos/config";

export type SuscripcionFranja = {
  estado: string; plan: string; cancelarAlFinal: boolean;
  pruebaFinalizaEn: string | null; proximoCobro: string | null; graciaHasta: string | null;
};

export function FranjaSuscripcion({ suscripcion }: { suscripcion: SuscripcionFranja | null }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    // Sólo actualiza el reloj local; no consulta la base ni Mercado Pago.
    const temporizador = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(temporizador);
  }, []);
  const aviso = avisoSuscripcion(suscripcion ? {
    ...suscripcion,
    pruebaFinalizaEn: suscripcion.pruebaFinalizaEn ? new Date(suscripcion.pruebaFinalizaEn) : null,
    proximoCobro: suscripcion.proximoCobro ? new Date(suscripcion.proximoCobro) : null,
    graciaHasta: suscripcion.graciaHasta ? new Date(suscripcion.graciaHasta) : null,
  } : null, ahora);
  if (!aviso) return null;
  const Icono = aviso.tipo === "vencimiento" ? Clock3 : Sparkles;
  return <aside className={`panel-franja-suscripcion panel-franja-suscripcion--${aviso.tipo}`} aria-label="Estado de tu plan">
    <Icono size={14} aria-hidden="true" />
    <span>{aviso.texto}</span>
    <Link href={aviso.href}>{aviso.accion}<ArrowUpRight size={14} aria-hidden="true" /></Link>
  </aside>;
}
