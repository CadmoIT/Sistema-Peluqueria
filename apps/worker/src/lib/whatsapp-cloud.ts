/** Entrega sólo plantillas de WhatsApp aprobadas para turnos del plan PRO. */
export function whatsappConfigurado() {
  return Boolean(
    process.env.META_WHATSAPP_TOKEN &&
    process.env.META_WHATSAPP_PHONE_NUMBER_ID &&
    process.env.META_WHATSAPP_PLANTILLA_CONFIRMACION &&
    process.env.META_WHATSAPP_PLANTILLA_RECORDATORIO,
  );
}

export async function enviarPlantillaWhatsapp(
  destinatario: string,
  tipo: "CONFIRMACION" | "RECORDATORIO",
  variables: { nombre: string; servicio: string; fecha: string; hora: string },
) {
  if (!whatsappConfigurado()) throw new Error("WhatsApp automático aún no está configurado.");
  const nombrePlantilla = tipo === "CONFIRMACION"
    ? process.env.META_WHATSAPP_PLANTILLA_CONFIRMACION
    : process.env.META_WHATSAPP_PLANTILLA_RECORDATORIO;
  const version = process.env.META_GRAPH_API_VERSION ?? "v23.0";
  const respuesta = await fetch(
    `https://graph.facebook.com/${version}/${process.env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario.replace(/\D/g, ""),
        type: "template",
        template: {
          name: nombrePlantilla,
          language: { code: "es_AR" },
          components: [{
            type: "body",
            parameters: [variables.nombre, variables.servicio, variables.fecha, variables.hora].map(
              (texto) => ({ type: "text", text: texto }),
            ),
          }],
        },
      }),
    },
  );
  if (!respuesta.ok) throw new Error(`Meta rechazó el aviso (${respuesta.status}).`);
}
