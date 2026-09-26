/** Centraliza el envío de correos transaccionales con Resend para web y worker. */
export type CorreoTransaccional = {
  destinatario: string;
  asunto: string;
  texto: string;
  responderA?: string | null;
  claveIdempotencia?: string;
  expiraEn?: Date;
};

export function resendConfigurado(entorno: NodeJS.ProcessEnv = process.env) {
  return Boolean(entorno.RESEND_API_KEY);
}

export async function enviarCorreoResend(
  correo: CorreoTransaccional,
  entorno: NodeJS.ProcessEnv = process.env,
) {
  const clave = entorno.RESEND_API_KEY;
  if (!clave) throw new Error("Falta RESEND_API_KEY para enviar correos.");

  const encabezados: Record<string, string> = {
    Authorization: `Bearer ${clave}`,
    "Content-Type": "application/json",
  };
  if (correo.claveIdempotencia) {
    encabezados["Idempotency-Key"] = correo.claveIdempotencia;
  }

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: encabezados,
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from:
        entorno.EMAIL_REMITENTE ??
        "TurnosRápidos <no-reply@mail.turnosrapidos.com.ar>",
      to: [correo.destinatario],
      subject: correo.asunto,
      text: correo.texto,
      ...(correo.responderA ? { reply_to: correo.responderA } : {}),
    }),
  });

  if (!respuesta.ok) {
    throw new Error(
      `Resend respondió ${respuesta.status} al enviar el correo.`,
    );
  }

  const resultado = (await respuesta.json()) as { id?: string };
  return resultado.id ?? null;
}
