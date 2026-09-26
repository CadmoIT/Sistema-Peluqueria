/** Cambia el local editado con el selector compartido del panel. */
import { FiltroLocalUrl, type OpcionLocal } from "./filtro-local";

export function SelectorLocalSitio({
  locales,
  valor,
}: {
  locales: OpcionLocal[];
  valor: string;
}) {
  return (
    <FiltroLocalUrl
      className="selector-local-sitio"
      sedes={locales}
      valor={valor}
      incluirTodos={false}
      ariaLabel="Local del sitio"
    />
  );
}
