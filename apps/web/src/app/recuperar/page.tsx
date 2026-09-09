/** Presenta el flujo de recuperación y cambio de contraseña. */
import { Suspense } from "react";
import { FormularioRecuperacion } from "@/componentes/autenticacion/formulario-recuperacion";
import "../acceder/acceso.css";

export const metadata = { title: "Recuperar acceso" };

export default function PaginaRecuperacion() {
  return (
    <Suspense>
      <FormularioRecuperacion />
    </Suspense>
  );
}
