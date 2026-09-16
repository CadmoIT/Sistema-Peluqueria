/** Cierra superficies temporales al tocar afuera o pulsar Escape sin cerrar secciones permanentes. */
"use client";

import { useEffect, type RefObject } from "react";

function estaDentro(elemento: HTMLElement, evento: PointerEvent) {
  if (elemento instanceof HTMLDialogElement && evento.target === elemento) {
    const limite = elemento.getBoundingClientRect();
    return (
      evento.clientX >= limite.left &&
      evento.clientX <= limite.right &&
      evento.clientY >= limite.top &&
      evento.clientY <= limite.bottom
    );
  }
  return evento.composedPath().includes(elemento);
}

export function useCierreExterior<T extends HTMLElement>(
  referencia: RefObject<T | null>,
  cerrar: () => void,
  activo = true,
) {
  useEffect(() => {
    if (!activo) return;
    function tocar(evento: PointerEvent) {
      const elemento = referencia.current;
      const superior = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1);
      if (elemento instanceof HTMLDialogElement && superior && superior !== elemento) return;
      if (elemento && !estaDentro(elemento, evento)) cerrar();
    }
    function teclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        const superior = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1);
        if (referencia.current instanceof HTMLDialogElement && superior && superior !== referencia.current) return;
        evento.preventDefault();
        cerrar();
      }
    }
    document.addEventListener("pointerdown", tocar, true);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("pointerdown", tocar, true);
      document.removeEventListener("keydown", teclado);
    };
  }, [referencia, cerrar, activo]);
}

const SELECTOR = [
  "details.desplegable-accion[open]",
  "details.selector-color[open]",
  "details.nav-panel__configuracion[open]",
  "details.agenda-filtros-movil[open]",
  "details[data-cierre-exterior][open]",
].join(",");

export function CierreDesplegables() {
  useEffect(() => {
    function tocar(evento: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(SELECTOR)
        .forEach((elemento) => {
          if (!estaDentro(elemento, evento)) elemento.open = false;
        });
    }
    function teclado(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      const abiertos = [
        ...document.querySelectorAll<HTMLDetailsElement>(SELECTOR),
      ];
      if (!abiertos.length) return;
      const enfocado = abiertos.find((elemento) =>
        elemento.contains(document.activeElement),
      );
      abiertos.forEach((elemento) => {
        elemento.open = false;
      });
      enfocado?.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", tocar, true);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("pointerdown", tocar, true);
      document.removeEventListener("keydown", teclado);
    };
  }, []);
  return null;
}
