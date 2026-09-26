/** Recibe y valida la configuración obligatoria del primer acceso. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { esCantidadLocalesValida, esRubroValido } from "@/lib/registro-inicial";
import { crearConfiguracionInicial } from "@/servicios/configuracion-inicial.service";

type CuerpoConfiguracion = {
  nombreNegocio?: unknown;
  tipoNegocio?: unknown;
  cantidadLocales?: unknown;
};

export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  if (superaLimiteDeclarado(solicitud, 8 * 1024)) {
    return NextResponse.json(
      { mensaje: "La solicitud es demasiado grande." },
      { status: 413 },
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

  const negocio = await crearConfiguracionInicial(sesion.user.id, {
    nombreNegocio,
    tipoNegocio,
    cantidadLocales,
  });
  return NextResponse.json(negocio);
}
