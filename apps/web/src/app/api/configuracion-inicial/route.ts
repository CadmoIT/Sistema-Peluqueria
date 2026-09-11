/** Recibe y valida la configuración obligatoria del primer acceso. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { esCantidadLocalesValida, esRubroValido } from "@/lib/registro-inicial";
import { crearConfiguracionInicial } from "@/servicios/configuracion-inicial.service";

type CuerpoConfiguracion = {
  nombreNegocio?: unknown;
  tipoNegocio?: unknown;
  cantidadLocales?: unknown;
};

export async function POST(solicitud: Request) {
  const cuerpo = (await solicitud
    .json()
    .catch(() => null)) as CuerpoConfiguracion | null;
  const nombreNegocio =
    typeof cuerpo?.nombreNegocio === "string"
      ? cuerpo.nombreNegocio.trim()
      : "";
  const tipoNegocio =
    typeof cuerpo?.tipoNegocio === "string" ? cuerpo.tipoNegocio : "";
  const cantidadLocales = Number(cuerpo?.cantidadLocales);

  if (
    nombreNegocio.length < 2 ||
    nombreNegocio.length > 80 ||
    !esRubroValido(tipoNegocio) ||
    !esCantidadLocalesValida(cantidadLocales)
  ) {
    return NextResponse.json(
      { mensaje: "Revisá los datos del negocio antes de continuar." },
      { status: 400 },
    );
  }

  const sesion = await autenticacion.api.getSession({
    headers: solicitud.headers,
  });
  if (!sesion) {
    return NextResponse.json(
      { mensaje: "Tu sesión venció. Volvé a ingresar." },
      { status: 401 },
    );
  }

  const negocio = await crearConfiguracionInicial(sesion.user.id, {
    nombreNegocio,
    tipoNegocio,
    cantidadLocales,
  });
  return NextResponse.json(negocio);
}
