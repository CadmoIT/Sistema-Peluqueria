/** Encola correos transaccionales en producción y muestra enlaces en desarrollo. */
import type { CorreoTransaccional } from "@turnos/correo";
import { prisma } from "./prisma";

export async function enviarCorreo({
  destinatario,
  asunto,
  texto,
  responderA,
  claveIdempotencia,
  expiraEn,
}: CorreoTransaccional) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[correo local] ${asunto} -> ${destinatario}\n${texto}`);
    return;
  }

  if (!claveIdempotencia) {
    throw new Error("El correo transaccional requiere una clave idempotente.");
  }

  await prisma.correoPendiente.upsert({
    where: { claveIdempotencia },
    create: {
      destinatario,
      asunto,
      texto,
      responderA,
      claveIdempotencia,
      expiraEn,
    },
    update: {},
  });
}
