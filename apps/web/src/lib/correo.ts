/** Envía correos transaccionales con Resend y permite inspeccionar enlaces en desarrollo. */
import { enviarCorreoResend, type CorreoTransaccional } from "@turnos/correo";

export async function enviarCorreo({
  destinatario,
  asunto,
  texto,
  claveIdempotencia,
}: CorreoTransaccional) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Falta RESEND_API_KEY para enviar correos transaccionales.",
      );
    }

    console.info(`[correo local] ${asunto} -> ${destinatario}\n${texto}`);
    return;
  }

  await enviarCorreoResend({
    destinatario,
    asunto,
    texto,
    claveIdempotencia,
  });
}
