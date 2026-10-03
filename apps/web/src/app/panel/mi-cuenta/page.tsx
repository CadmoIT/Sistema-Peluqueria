/** Mantiene la cuenta personal separada de los datos de cada negocio. */
import Link from "next/link";
import { DatosCuentaPersonal } from "@/componentes/panel/datos-cuenta-personal";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
export default async function MiCuenta() {
  const c = await requerirContextoPanel();
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/mi-cuenta" />
      <h1>Mi cuenta</h1>
      <p>{c.usuario.email}</p>
      <DatosCuentaPersonal nombre={c.usuario.name} />
      <p>
        Negocio activo: {c.negocio.nombre} ·{" "}
        {c.membresia.rol === "PROFESIONAL"
          ? "Empleado"
          : c.membresia.rol === "DUENO"
            ? "Dueño"
            : "Administrador"}
      </p>
      <p>
        <Link href="/seleccionar-negocio">Cambiar de negocio →</Link>
      </p>
      <p>
        <Link href="/panel/configuracion/seguridad">
          Seguridad de mi cuenta →
        </Link>
      </p>
      <p>
        <Link href="/recuperar">Cambiar o recuperar mi contraseña →</Link>
      </p>
    </div>
  );
}
