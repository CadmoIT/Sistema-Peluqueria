/** Envía correos transaccionales con Resend y permite inspeccionar enlaces en desarrollo. */
type CorreoTransaccional = {
  destinatario: string;
  asunto: string;
  texto: string;
};

export async function enviarCorreo({
  destinatario,
  asunto,
  texto,
}: CorreoTransaccional) {
  const clave = process.env.RESEND_API_KEY;

  if (!clave) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Falta RESEND_API_KEY para enviar correos transaccionales.",
      );
    }

    console.info(`[correo local] ${asunto} -> ${destinatario}\n${texto}`);
    return;
  }

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.EMAIL_REMITENTE ??
        "TurnosRapidos <no-reply@turnosrapidos.com.ar>",
      to: [destinatario],
      subject: asunto,
      text: texto,
    }),
  });

  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}.`);
}
