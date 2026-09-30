/** Consume el código de un solo uso y emite una sesión breve de recuperación. */
import { NextResponse } from "next/server";
import { esOrigenMismoSitio } from "@/lib/origen-solicitud";
import { superaLimiteDeclarado } from "@/lib/limite-solicitud";
import {
  esEmailRecuperacionValido,
  normalizarEmailRecuperacion,
  verificarCodigoRecuperacion,
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

  let email = "";
  let codigo = "";
  try {
    const cuerpo = await solicitud.json();
    email =
      typeof cuerpo.email === "string"
        ? normalizarEmailRecuperacion(cuerpo.email)
        : "";
    codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo : "";
  } catch {
    // La respuesta genérica de abajo cubre cuerpos que no se pudieron leer.
  }
  if (!esEmailRecuperacionValido(email) || !/^\d{6}$/.test(codigo)) {
    return NextResponse.json(
      { mensaje: "El código no es válido o venció." },
      { status: 400 },
    );
  }

  const sesion = await verificarCodigoRecuperacion(email, codigo);
  if (!sesion) {
    return NextResponse.json(
      { mensaje: "El código no es válido o venció." },
      { status: 400 },
    );
  }

  const expiracion = Math.max(
    1,
    Math.floor((sesion.expiraEn.getTime() - Date.now()) / 1000),
  );
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set("tr-recuperacion", sesion.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/recuperacion",
    maxAge: expiracion,
  });
  return respuesta;
}
