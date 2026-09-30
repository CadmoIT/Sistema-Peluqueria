/** Coordina solicitudes, códigos de un solo uso y cambios de contraseña. */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { enviarCorreo } from "@/lib/correo";
import { prisma } from "@/lib/prisma";
import {
  cifrarDatoRecuperacion,
  compararHuellaSegura,
  crearHuella,
  descifrarDatoRecuperacion,
  evaluarLimiteEnvioRecuperacion,
  firmarPermisoSolicitud,
  generarCodigoRecuperacion,
  generarTokenRecuperacion,
  huellaEmailRecuperacion,
  normalizarEmailRecuperacion,
  validarPermisoSolicitud,
} from "./seguridad-recuperacion";

const DURACION_CODIGO_MS = 10 * 60_000;
const MAX_INTENTOS_CODIGO = 3;
const MENSAJE_SOLICITUD =
  "Si el email está registrado, vas a recibir un código para recuperar tu acceso.";

type EstadoRecuperacion = Prisma.RecuperacionContrasenaGetPayload<
  Record<string, never>
>;

export function esEmailRecuperacionValido(email: string) {
  const normalizado = normalizarEmailRecuperacion(email);
  return (
    normalizado.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)
  );
}

export async function reservarEnvioRecuperacion(
  emailHash: string,
  ahora = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    await tx.recuperacionContrasena.upsert({
      where: { emailHash },
      create: {
        emailHash,
        ventanaEnviosDesde: ahora,
        enviosEnVentana: 0,
      },
      update: { actualizadoEn: ahora },
    });
    await tx.$queryRaw`SELECT "id" FROM "RecuperacionContrasena" WHERE "emailHash" = ${emailHash} FOR UPDATE`;
    const estado = await tx.recuperacionContrasena.findUniqueOrThrow({
      where: { emailHash },
    });

    const politica = evaluarLimiteEnvioRecuperacion(
      {
        ventanaDesde: estado.ventanaEnviosDesde,
        envios: estado.enviosEnVentana,
        ultimoEnvio: estado.ultimoEnvioEn,
      },
      ahora,
    );
    if (!politica.permitido) {
      if (
        estado.ventanaEnviosDesde?.getTime() !==
          politica.ventanaDesde.getTime() ||
        estado.enviosEnVentana !== politica.envios
      ) {
        await tx.recuperacionContrasena.update({
          where: { emailHash },
          data: {
            ventanaEnviosDesde: politica.ventanaDesde,
            enviosEnVentana: politica.envios,
          },
        });
      }
      return {
        permitido: false,
        reintentarEn: politica.reintentarEn,
      };
    }
    await tx.recuperacionContrasena.update({
      where: { emailHash },
      data: {
        ventanaEnviosDesde: politica.ventanaDesde,
        enviosEnVentana: politica.envios + 1,
        ultimoEnvioEn: ahora,
      },
    });
    return { permitido: true, reintentarEn: 60 };
  });
}

export function permisoSolicitudInterna(emailHash: string) {
  const timestamp = Date.now();
  return `${timestamp}.${firmarPermisoSolicitud(emailHash, timestamp)}`;
}

export function solicitudInternaAutorizada(
  permiso: string | null,
  emailHash: string,
) {
  return validarPermisoSolicitud(permiso, emailHash);
}

export async function obtenerCodigoVigente(
  emailHash: string,
  ahora = new Date(),
) {
  const estado = await prisma.recuperacionContrasena.findUnique({
    where: { emailHash },
  });
  if (
    !estado ||
    !estado.codigoHash ||
    !estado.codigoCifrado ||
    !estado.tokenResetCifrado ||
    !estado.codigoExpiraEn ||
    estado.codigoExpiraEn <= ahora ||
    estado.codigoConsumidoEn ||
    estado.completadoEn ||
    estado.intentosCodigo >= MAX_INTENTOS_CODIGO
  ) {
    return null;
  }
  return {
    estado,
    codigo: descifrarDatoRecuperacion(estado.codigoCifrado),
  };
}

export async function enviarCodigoRecuperacion(
  email: string,
  emailHash: string,
  codigo: string,
  numeroEnvio: number,
  expiraEn: Date,
) {
  const envioHash = createHash("sha256")
    .update(`${emailHash}:${expiraEn.toISOString()}:${numeroEnvio}`)
    .digest("hex");
  await enviarCorreo({
    destinatario: email,
    asunto: "Tu código para recuperar TurnosRápidos",
    texto: [
      "Recibimos una solicitud para cambiar la contraseña de tu cuenta de TurnosRápidos.",
      "",
      `Tu código de recuperación es: ${codigo}`,
      "",
      "Ingresalo en la aplicación dentro de los próximos 10 minutos. Si no hiciste esta solicitud, podés ignorar este correo.",
    ].join("\n"),
    claveIdempotencia: `recuperacion-${envioHash}`,
    expiraEn,
  });
}

export async function crearOReutilizarCodigo(
  email: string,
  tokenReset: string,
  emailHash: string,
) {
  const ahora = new Date();
  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RecuperacionContrasena" WHERE "emailHash" = ${emailHash} FOR UPDATE`;
    const estado = await tx.recuperacionContrasena.findUniqueOrThrow({
      where: { emailHash },
    });
    const codigoActivo = Boolean(
      estado.codigoHash &&
      estado.codigoCifrado &&
      estado.tokenResetCifrado &&
      estado.codigoExpiraEn &&
      estado.codigoExpiraEn > ahora &&
      !estado.codigoConsumidoEn &&
      !estado.completadoEn &&
      estado.intentosCodigo < MAX_INTENTOS_CODIGO,
    );

    if (codigoActivo) {
      return {
        codigo: descifrarDatoRecuperacion(estado.codigoCifrado!),
        expiraEn: estado.codigoExpiraEn!,
        numeroEnvio: estado.enviosEnVentana,
        tokenNuevoIgnorado: true,
      };
    }

    const codigo = generarCodigoRecuperacion();
    const expiraEn = new Date(ahora.getTime() + DURACION_CODIGO_MS);
    await tx.recuperacionContrasena.update({
      where: { emailHash },
      data: {
        codigoHash: crearHuella(`${emailHash}:${codigo}`),
        codigoCifrado: cifrarDatoRecuperacion(codigo),
        tokenResetCifrado: cifrarDatoRecuperacion(tokenReset),
        codigoExpiraEn: expiraEn,
        intentosCodigo: 0,
        codigoConsumidoEn: null,
        tokenSesionHash: null,
        sesionExpiraEn: null,
        completadoEn: null,
      },
    });
    return {
      codigo,
      expiraEn,
      numeroEnvio: estado.enviosEnVentana,
      tokenNuevoIgnorado: false,
    };
  });

  if (resultado.tokenNuevoIgnorado) {
    await prisma.verificacion.deleteMany({
      where: { identificador: `reset-password:${tokenReset}` },
    });
  }
  await enviarCodigoRecuperacion(
    email,
    emailHash,
    resultado.codigo,
    resultado.numeroEnvio,
    resultado.expiraEn,
  );
}

export async function reenviarCodigoRecuperacion(
  email: string,
  emailHash: string,
) {
  const vigente = await obtenerCodigoVigente(emailHash);
  if (!vigente) return;
  await enviarCodigoRecuperacion(
    email,
    emailHash,
    vigente.codigo,
    vigente.estado.enviosEnVentana,
    vigente.estado.codigoExpiraEn!,
  );
}

export async function verificarCodigoRecuperacion(
  email: string,
  codigo: string,
) {
  const emailHash = huellaEmailRecuperacion(email);
  const tokenSesion = generarTokenRecuperacion();
  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RecuperacionContrasena" WHERE "emailHash" = ${emailHash} FOR UPDATE`;
    const estado = await tx.recuperacionContrasena.findUnique({
      where: { emailHash },
    });
    const ahora = new Date();
    if (
      !estado ||
      !estado.codigoHash ||
      !estado.codigoExpiraEn ||
      estado.codigoExpiraEn <= ahora ||
      estado.codigoConsumidoEn ||
      estado.completadoEn ||
      estado.intentosCodigo >= MAX_INTENTOS_CODIGO
    ) {
      return null;
    }
    const codigoHash = crearHuella(`${emailHash}:${codigo}`);
    if (!compararHuellaSegura(estado.codigoHash, codigoHash)) {
      await tx.recuperacionContrasena.update({
        where: { emailHash },
        data: { intentosCodigo: { increment: 1 } },
      });
      return null;
    }
    await tx.recuperacionContrasena.update({
      where: { emailHash },
      data: {
        codigoConsumidoEn: ahora,
        tokenSesionHash: crearHuella(tokenSesion),
        sesionExpiraEn: estado.codigoExpiraEn,
      },
    });
    return { expiraEn: estado.codigoExpiraEn };
  });

  return resultado
    ? { token: tokenSesion, expiraEn: resultado.expiraEn }
    : null;
}

export async function restablecerContrasenaRecuperacion(
  tokenSesion: string,
  nuevaContrasena: string,
) {
  const tokenSesionHash = crearHuella(tokenSesion);
  const estado: EstadoRecuperacion | null =
    await prisma.recuperacionContrasena.findFirst({
      where: {
        tokenSesionHash,
        sesionExpiraEn: { gt: new Date() },
        codigoConsumidoEn: { not: null },
        completadoEn: null,
      },
    });
  if (!estado?.tokenResetCifrado) return false;

  const tokenReset = descifrarDatoRecuperacion(estado.tokenResetCifrado);
  try {
    const { autenticacion } = await import("@/lib/autenticacion");
    await autenticacion.api.resetPassword({
      body: { token: tokenReset, newPassword: nuevaContrasena },
    });
  } catch {
    return false;
  }

  await prisma.recuperacionContrasena.updateMany({
    where: { id: estado.id, tokenSesionHash },
    data: {
      completadoEn: new Date(),
      codigoHash: null,
      codigoCifrado: null,
      tokenResetCifrado: null,
      tokenSesionHash: null,
    },
  });
  return true;
}

export {
  huellaEmailRecuperacion,
  normalizarEmailRecuperacion,
  MENSAJE_SOLICITUD,
};
