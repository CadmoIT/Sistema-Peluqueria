/** Cambia la contraseña usando la sesión temporal creada al verificar el código. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import { restablecerContrasenaRecuperacion } from "@/servicios/recuperacion-contrasena.service";

function leerCookie(cookies: string | null, nombre: string) {
  const cookie = cookies
    ?.split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nombre}=`));
  return cookie ? decodeURIComponent(cookie.slice(nombre.length + 1)) : null;
}

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

  let contrasena: string;
  let confirmacion: string;
  try {
    const cuerpo = await solicitud.json();
    contrasena = typeof cuerpo.contrasena === "string" ? cuerpo.contrasena : "";
    confirmacion =
      typeof cuerpo.confirmacion === "string" ? cuerpo.confirmacion : "";
  } catch {
    return NextResponse.json(
      { mensaje: "Revisá los datos ingresados." },
      { status: 400 },
    );
  }
  if (contrasena.length < 8 || contrasena.length > 128) {
    return NextResponse.json(
      { mensaje: "La contraseña debe tener entre 8 y 128 caracteres." },
      { status: 400 },
    );
  }
  if (contrasena !== confirmacion) {
    return NextResponse.json(
      { mensaje: "Las contraseñas no coinciden." },
      { status: 400 },
    );
  }

  const tokenSesion = leerCookie(
    solicitud.headers.get("cookie"),
    "tr-recuperacion",
  );
  if (
    !tokenSesion ||
    !(await restablecerContrasenaRecuperacion(tokenSesion, contrasena))
  ) {
    const respuesta = NextResponse.json(
      { mensaje: "La sesión de recuperación venció. Empezá de nuevo." },
      { status: 400 },
    );
    respuesta.cookies.set("tr-recuperacion", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/recuperacion",
      maxAge: 0,
    });
    return respuesta;
  }

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set("tr-recuperacion", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/recuperacion",
    maxAge: 0,
  });
  return respuesta;
}
