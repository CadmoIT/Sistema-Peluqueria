/** Configura Better Auth con Prisma, email/contraseña, Google y sesiones seguras. */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { createHash } from "node:crypto";
import { enviarCorreo } from "./correo";
import { prisma } from "./prisma";
import { obtenerSecretoAutenticacion } from "./secreto-autenticacion";

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
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await enviarCorreo({
        destinatario: user.email,
        asunto: "Restablecé tu contraseña de TurnosRapidos",
        texto: `Abrí este enlace para elegir una contraseña nueva: ${url}`,
        claveIdempotencia: claveIdempotenciaCorreo("reset", url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await enviarCorreo({
        destinatario: user.email,
        asunto: "Verificá tu cuenta de TurnosRapidos",
        texto: `Confirmá tu email desde este enlace: ${url}`,
        claveIdempotencia: claveIdempotenciaCorreo("verificar", url),
      });
    },
  },
  socialProviders: googleConfigurado
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
