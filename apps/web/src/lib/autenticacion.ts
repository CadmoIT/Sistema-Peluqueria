/** Configura Better Auth con Prisma, email/contraseña, Google y sesiones seguras. */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { createHash } from "node:crypto";
import { enviarCorreo } from "./correo";
import { prisma } from "./prisma";
import { obtenerSecretoAutenticacion } from "./secreto-autenticacion";
import {
  crearOReutilizarCodigo,
  huellaEmailRecuperacion,
  reservarEnvioRecuperacion,
  solicitudInternaAutorizada,
} from "@/servicios/recuperacion-contrasena.service";

const googleConfigurado = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const autenticacion = betterAuth({
  appName: process.env.MARCA_APP ?? "TurnosRapidos",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.WEB_URL ??
    "http://localhost:3000",
  basePath: "/api/autenticacion",
  secret: obtenerSecretoAutenticacion(),
  trustedOrigins: [process.env.WEB_URL ?? "http://localhost:3000"],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 10 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }, request) => {
      const emailHash = huellaEmailRecuperacion(user.email);
      const permisoInterno =
        request?.headers.get("x-turnos-reset-budget") ?? null;
      if (!solicitudInternaAutorizada(permisoInterno, emailHash)) {
        const limite = await reservarEnvioRecuperacion(emailHash);
        if (!limite.permitido) return;
      }
      await crearOReutilizarCodigo(user.email, token, emailHash);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await enviarCorreo({
        destinatario: user.email,
        asunto: "Verificá tu cuenta de TurnosRapidos",
        texto: textoVerificacion(url),
        html: htmlVerificacion(url),
        claveIdempotencia: claveIdempotenciaCorreo("verificar", url),
        expiraEn: new Date(Date.now() + 60 * 60 * 1000),
      });
    },
  },
  socialProviders: googleConfigurado
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          requireEmailVerification: true,
          // Turnos Rápidos exige una confirmación propia antes de habilitar cuentas nuevas.
          // Better Auth conserva la verificación guardada para usuarios que ya existen.
          mapProfileToUser: () => ({ emailVerified: false }),
        },
      }
    : {},
  user: {
    modelName: "usuario",
    fields: {
      name: "nombre",
      emailVerified: "emailVerificado",
      image: "imagen",
      createdAt: "creadoEn",
      updatedAt: "actualizadoEn",
    },
  },
  session: {
    modelName: "sesion",
    fields: {
      userId: "usuarioId",
      expiresAt: "expiraEn",
      ipAddress: "ip",
      userAgent: "agente",
      createdAt: "creadoEn",
      updatedAt: "actualizadoEn",
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "cuentaOAuth",
    encryptOAuthTokens: true,
    fields: {
      userId: "usuarioId",
      accountId: "cuentaProveedorId",
      providerId: "proveedor",
      accessTokenExpiresAt: "accessTokenExpiraEn",
      refreshTokenExpiresAt: "refreshTokenExpiraEn",
      scope: "alcance",
      password: "contrasena",
      createdAt: "creadoEn",
      updatedAt: "actualizadoEn",
    },
  },
  verification: {
    modelName: "verificacion",
    fields: {
      identifier: "identificador",
      value: "valor",
      expiresAt: "expiraEn",
      createdAt: "creadoEn",
      updatedAt: "actualizadoEn",
    },
  },
  rateLimit: { enabled: true, window: 60, max: 100 },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});

function claveIdempotenciaCorreo(tipo: string, enlace: string) {
  const huella = createHash("sha256").update(enlace).digest("hex");
  return `${tipo}-${huella}`;
}

function textoVerificacion(url: string) {
  return `¡Hola!\n\n¡Te damos la bienvenida a Turnos Rápidos! Nos alegra que te sumes.\n\nPara confirmar que esta dirección de email es tuya y activar tu cuenta, hacé clic en el siguiente enlace:\n${url}\n\nEl enlace es válido durante una hora. Si no creaste una cuenta en Turnos Rápidos, podés ignorar este mensaje.\n\n¡Gracias por elegirnos!\nEl equipo de Turnos Rápidos`;
}

function htmlVerificacion(url: string) {
  const baseUrl = (process.env.WEB_URL ?? process.env.BETTER_AUTH_URL ?? "https://turnosrapidos.com.ar").replace(/\/+$/, "");
  const enlace = escaparHtml(url);
  const logo = `${baseUrl}/marca/favicon.png`;

  return `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#19324b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="height:7px;background:#0798bd;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 36px 20px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.5;">¡Hola!</p>
            <h1 style="margin:0 0 16px;font-size:25px;line-height:1.25;color:#123451;">¡Te damos la bienvenida a Turnos Rápidos!</h1>
            <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#43566a;">Nos alegra que te sumes. Confirmá que esta dirección de email es tuya para activar tu cuenta y empezar a configurar tu negocio.</p>
            <p style="margin:26px 0;text-align:center;">
              <a href="${enlace}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#087fa7;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Confirmar mi email</a>
            </p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#65778a;">El enlace vence en una hora. Si el botón no funciona, copiá este enlace en tu navegador:</p>
            <p style="margin:0 0 22px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${enlace}" style="color:#087fa7;">${enlace}</a></p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#65778a;">Si no creaste esta cuenta, podés ignorar este mensaje.</p>
          </td></tr>
          <tr><td align="center" style="padding:20px 24px 28px;border-top:1px solid #e8edf2;">
            <img src="${escaparHtml(logo)}" width="48" height="48" alt="Turnos Rápidos" style="display:block;width:48px;height:48px;margin:0 auto 8px;border:0;">
            <p style="margin:0;font-size:13px;font-weight:bold;letter-spacing:.2px;color:#19324b;">Turnos Rápidos</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#8290a0;">Este es un mensaje automático; no respondas a este correo.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
