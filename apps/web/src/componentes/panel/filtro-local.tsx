/** Unifica los selectores de sede del panel y conserva el resto de filtros. */
"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

export type OpcionLocal = { id: string; nombre: string };

type Props = {
  sedes: OpcionLocal[];
  valor: string;
  incluirTodos?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function ControlFiltroLocal({
  sedes,
  valor,
  incluirTodos = true,
  ariaLabel = "Filtrar por local",
  className,
  onChange,
}: Props & { onChange: (valor: string) => void }) {
  return (
    <span className={className}>
      <span className="filtro-select-control">
        <select
          aria-label={ariaLabel}
          value={valor}
          onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
            onChange(evento.target.value)
          }
        >
          {incluirTodos && <option value="">Todos</option>}
          {sedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} />
      </span>
    </span>
  );
}

export function FiltroLocalUrl(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiar(valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    if (valor) parametros.set("local", valor);
    else parametros.delete("local");
    const query = parametros.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return <ControlFiltroLocal {...props} onChange={cambiar} />;
}
