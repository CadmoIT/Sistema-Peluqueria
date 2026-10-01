/** Recuperación explícita del sitio reservado, con aviso de plan requerido. */
"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recuperarSitio } from "@/app/panel/mi-sitio/acciones";

export function RecuperarSitio({ habilitado }: { habilitado: boolean }) {
  const [mensaje, setMensaje] = useState("");
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  return <section className="sitio-recuperacion">
    <h2>Tu sitio puede volver a abrir sus puertas</h2>
    <p>Lo retiramos tras 30 días sin contratar un plan desde el fin de la prueba. Guardamos tu dirección, diseño y datos para que puedas recuperarlo.</p>
    <button className="boton boton--primario" disabled={pendiente} onClick={() => {
      if (!habilitado) {
        setMensaje("Activá Plus o Pro para volver a generar tu sitio y recibir reservas otra vez.");
        return;
      }
      iniciar(async () => {
        try {
          const resultado = await recuperarSitio();
          setMensaje(resultado.mensaje);
          if (resultado.ok) router.refresh();
        } catch { setMensaje("No pudimos recuperar el sitio. Intentá nuevamente."); }
      });
    }}>{pendiente ? "Recuperando…" : "Volver a generar mi sitio"}</button>
    {mensaje && <p role="status">{mensaje}</p>}
    {!habilitado && mensaje && <Link href="/panel/planes">Conocer Plus y Pro →</Link>}
  </section>;
}
