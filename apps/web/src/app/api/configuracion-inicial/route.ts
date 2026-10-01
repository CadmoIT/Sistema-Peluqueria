/** Recibe y valida la configuración obligatoria del primer acceso. */
import { NextResponse } from "next/server";
import { PLANES, PLAN_GRATIS, PLAN_PRO } from "@turnos/config";
import { autenticacion } from "@/lib/autenticacion";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { esCantidadLocalesValida, esRubroValido } from "@/lib/registro-inicial";
import { crearConfiguracionInicial } from "@/servicios/configuracion-inicial.service";

type CuerpoConfiguracion = {
  nombreNegocio?: unknown;
  tipoNegocio?: unknown;
  cantidadLocales?: unknown;
  planId?: unknown;
};

const planesDisponibles = [PLAN_GRATIS, ...PLANES, PLAN_PRO];

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
  const planId = typeof cuerpo?.planId === "string" ? cuerpo.planId : "";
  const plan = planesDisponibles.find((opcion) => opcion.id === planId);

  if (
    nombreNegocio.length < 2 ||
    nombreNegocio.length > 80 ||
    !esRubroValido(tipoNegocio) ||
    !esCantidadLocalesValida(cantidadLocales) ||
    !plan
  ) {
    return NextResponse.json(
      { mensaje: "Revisá los datos del negocio antes de continuar." },
      { status: 400 },
    );
  }

  if (plan.id !== PLAN_GRATIS.id && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json(
      {
        mensaje:
          "La contratación de planes pagos todavía no está configurada. Elegí Gratis por 7 días o intentá más tarde.",
      },
      { status: 503 },
    );
  }

  const negocio = await crearConfiguracionInicial(sesion.user.id, {
    nombreNegocio,
    tipoNegocio,
    cantidadLocales,
  });
  return NextResponse.json({ ...negocio, planId: plan.id });
}
