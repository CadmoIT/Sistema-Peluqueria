/** Envía avisos operativos desde la cuenta central de TurnosRápidos. */
import nodemailer from "nodemailer";

export function smtpConfigurado() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_OAUTH_CLIENT_ID &&
    process.env.SMTP_OAUTH_CLIENT_SECRET &&
    process.env.SMTP_OAUTH_REFRESH_TOKEN,
  );
}

export async function enviarCorreoAviso(
  destinatario: string,
  asunto: string,
  texto: string,
  responderA?: string | null,
) {
  if (!smtpConfigurado()) throw new Error("El correo automático aún no está configurado.");

  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: {
      type: "OAuth2",
      user: process.env.SMTP_USER,
      clientId: process.env.SMTP_OAUTH_CLIENT_ID,
      clientSecret: process.env.SMTP_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.SMTP_OAUTH_REFRESH_TOKEN,
    },
  });

  await transporte.sendMail({
    from: process.env.SMTP_REMITENTE ?? process.env.SMTP_USER,
    to: destinatario,
    replyTo: responderA || undefined,
    subject: asunto,
    text: texto,
  });
}
