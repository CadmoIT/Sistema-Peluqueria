/** Actualiza entre cuentas sin consultar en segundo plano ni descartar formularios. */
"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
export function ActualizacionEquipo({
  negocioId,
  versionInicial,
}: {
  negocioId: string;
  versionInicial: string;
}) {
  const router = useRouter(),
    ruta = usePathname(),
    version = useRef(versionInicial);
  useEffect(() => {
    version.current = versionInicial;
  }, [versionInicial]);
  useEffect(() => {
    let cerrado = false,
      pendiente = false;
    const controlador = new AbortController();
    const formulariosEditados = new Set<HTMLFormElement>();
    function editar(e: Event) {
      const form = (e.target as HTMLElement)?.closest("form");
      if (form) formulariosEditados.add(form);
    }
    function guardado(e: Event) {
      formulariosEditados.delete((e as CustomEvent<HTMLFormElement>).detail);
    }
    function reiniciar(e: Event) {
      formulariosEditados.delete(e.target as HTMLFormElement);
    }
    async function consultar() {
      if (cerrado || pendiente || document.hidden) return;
      pendiente = true;
      try {
        const r = await fetch("/api/panel/cambios", {
          cache: "no-store",
          signal: controlador.signal,
        });
        if (cerrado) return;
        if (r.status === 401 || r.status === 403) {
          window.location.assign("/seleccionar-negocio");
          return;
        }
        if (!r.ok) return;
        const datos = (await r.json()) as {
          negocioId: string;
          version: string;
        };
        if (cerrado || document.hidden) return;
        if (datos.negocioId !== negocioId) {
          window.location.reload();
          return;
        }
        for (const form of formulariosEditados)
          if (!form.isConnected) formulariosEditados.delete(form);
        if (
          formulariosEditados.size ||
          document.querySelector(
            "details[open],dialog[open],[role='dialog'],[aria-busy='true']",
          ) ||
          document.activeElement?.matches("input,textarea,select")
        )
          return;
        if (version.current !== datos.version) router.refresh();
        version.current = datos.version;
      } catch {
        /* Una caída temporal no interrumpe el trabajo. */
      } finally {
        pendiente = false;
      }
    }
    const intervalo = setInterval(consultar, 10_000);
    document.addEventListener("input", editar);
    document.addEventListener("equipo-formulario-guardado", guardado);
    document.addEventListener("reset", reiniciar);
    window.addEventListener("focus", consultar);
    document.addEventListener("visibilitychange", consultar);
    void consultar();
    return () => {
      cerrado = true;
      controlador.abort();
      clearInterval(intervalo);
      document.removeEventListener("input", editar);
      document.removeEventListener("equipo-formulario-guardado", guardado);
      document.removeEventListener("reset", reiniciar);
      window.removeEventListener("focus", consultar);
      document.removeEventListener("visibilitychange", consultar);
    };
  }, [negocioId, ruta, router]);
  return null;
}
