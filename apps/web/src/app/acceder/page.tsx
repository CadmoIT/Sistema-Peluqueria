/** Presenta el acceso y registro de propietarios y colaboradores. */
import { Suspense } from "react";
import { FormularioAcceso } from "../../componentes/autenticacion/formulario-acceso";
import "./acceso.css";
export const metadata = { title: "Acceso" };
export default function PaginaAcceso() {
  return (
    <Suspense>
      <FormularioAcceso />
    </Suspense>
  );
}
