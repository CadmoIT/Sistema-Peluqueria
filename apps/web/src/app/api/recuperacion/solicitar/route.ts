/** Solicita un código de recuperación sin revelar si existe la cuenta. */
import { NextResponse } from "next/server";
import { autenticacion } from "@/lib/autenticacion";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import {
  esEmailRecuperacionValido,
  huellaEmailRecuperacion,
  MENSAJE_SOLICITUD,
  normalizarEmailRecuperacion,
  obtenerCodigoVigente,
  permisoSolicitudInterna,
  reenviarCodigoRecuperacion,
  reservarEnvioRecuperacion,
} from "@/servicios/recuperacion-contrasena.service";

export async function POST(solicitud: Request) {
  if (!esOrigenMismoSitio(solicitud)) {
    return NextResponse.json({ mensaje: "Origen no válido." }, { status: 403 });
  }
  if (superaLimiteDeclarado(solicitud, 8 * 1024)) {
    return NextResponse.json(
      { mensaje: "Solicitud demasiado grande." },
      { status: 413 },
    );
  }

  let email: string;
  try {
    const cuerpo = await solicitud.json();
    email =
      typeof cuerpo.email === "string"
        ? normalizarEmailRecuperacion(cuerpo.email)
        : "";
  } catch {
    email = "";
  }
  if (!esEmailRecuperacionValido(email)) {
    return NextResponse.json(
      { mensaje: "Ingresá un email válido." },
      { status: 400 },
    );
  }

  const emailHash = huellaEmailRecuperacion(email);
  const limite = await reservarEnvioRecuperacion(emailHash);
  if (!limite.permitido) {
    const respuesta = NextResponse.json({
      mensaje: MENSAJE_SOLICITUD,
      reintentarEn: limite.reintentarEn,
    });
    respuesta.cookies.set("tr-recuperacion", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/recuperacion",
      maxAge: 0,
    });
    return respuesta;
  }

  const vigente = await obtenerCodigoVigente(emailHash);
  if (vigente) {
    await reenviarCodigoRecuperacion(email, emailHash);
  } else {
    const encabezados = new Headers(solicitud.headers);
    encabezados.delete("content-length");
    encabezados.set("content-type", "application/json");
    encabezados.set(
      "x-turnos-reset-budget",
      permisoSolicitudInterna(emailHash),
    );
    const urlAutenticacion = new URL(
      "/api/autenticacion/request-password-reset",
      solicitud.url,
    );
    await autenticacion.handler(
      new Request(urlAutenticacion, {
        method: "POST",
        headers: encabezados,
        body: JSON.stringify({ email, redirectTo: "/recuperar" }),
      }),
    );
  }

  const respuesta = NextResponse.json({
    mensaje: MENSAJE_SOLICITUD,
    reintentarEn: limite.reintentarEn,
  });
  respuesta.cookies.set("tr-recuperacion", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/recuperacion",
    maxAge: 0,
  });
  return respuesta;
}
