/** Entrega la bandeja persistente de correos y recupera reclamos abandonados. */
import type { Job } from "pg-boss";
import { enviarCorreoResend } from "@turnos/correo";
import { prisma } from "../lib/prisma.js";
import { MAX_INTENTOS_ENTREGA, proximoIntento } from "../lib/reintentos.js";

export const COLA_ENVIAR_CORREOS = "enviar-correos";
const TAMANO_LOTE = 20;

type CorreoReclamado = {
  id: string;
  destinatario: string;
  asunto: string;
  texto: string;
  responderA: string | null;
  claveIdempotencia: string;
  intentos: number;
  expiraEn: Date | null;
};

export async function procesarCorreosPendientes(_trabajos: Job[]) {
  const ahora = new Date();
  const reclamoVencidoEn = new Date(ahora.getTime() - 10 * 60_000);
  await prisma.correoPendiente.updateMany({
    where: {
      expiraEn: { lte: ahora },
      OR: [
        { estado: "PENDIENTE" },
        {
          estado: "ENVIANDO",
          OR: [
            { reclamadoEn: null },
            { reclamadoEn: { lte: reclamoVencidoEn } },
          ],
        },
      ],
    },
    data: {
      estado: "FALLIDO",
      texto: "",
      reclamadoEn: null,
      error: "El enlace de autenticación expiró antes del envío.",
    },
  });

  const correos = await prisma.$queryRaw<CorreoReclamado[]>`
    WITH por_reclamar AS (
      SELECT "id"
      FROM "CorreoPendiente"
      WHERE (
        (
          "estado" = 'PENDIENTE'
          AND ("proximoIntentoEn" IS NULL OR "proximoIntentoEn" <= NOW())
        ) OR (
        "estado" = 'ENVIANDO'
        AND (
          "reclamadoEn" IS NULL
          OR "reclamadoEn" <= NOW() - INTERVAL '10 minutes'
        )
        )
      )
      AND ("expiraEn" IS NULL OR "expiraEn" > NOW())
      ORDER BY "creadoEn" ASC
      LIMIT ${TAMANO_LOTE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "CorreoPendiente" AS correo
    SET "estado" = 'ENVIANDO',
        "intentos" = correo."intentos" + 1,
        "reclamadoEn" = NOW(),
        "actualizadoEn" = NOW()
    FROM por_reclamar
    WHERE correo."id" = por_reclamar."id"
    RETURNING correo."id", correo."destinatario", correo."asunto",
      correo."texto", correo."responderA", correo."claveIdempotencia",
      correo."intentos", correo."expiraEn"
  `;

  for (const correo of correos) {
    if (correo.expiraEn && correo.expiraEn <= new Date()) {
      await prisma.correoPendiente.update({
        where: { id: correo.id },
        data: {
          estado: "FALLIDO",
          texto: "",
          reclamadoEn: null,
          error: "El enlace de autenticación expiró antes del envío.",
        },
      });
      continue;
    }

    try {
      const proveedorId = await enviarCorreoResend({
        destinatario: correo.destinatario,
        asunto: correo.asunto,
        texto: correo.texto,
        responderA: correo.responderA,
        claveIdempotencia: correo.claveIdempotencia,
      });
      await prisma.correoPendiente.update({
        where: { id: correo.id },
        data: {
          estado: "ENVIADO",
          enviadoEn: new Date(),
          proveedorId,
          texto: "",
          reclamadoEn: null,
          error: null,
        },
      });
    } catch (error) {
      const mensaje = (
        error instanceof Error
          ? error.message
          : "No se pudo entregar el correo."
      ).slice(0, 180);
      const siguiente =
        correo.intentos < MAX_INTENTOS_ENTREGA
          ? proximoIntento(correo.intentos)
          : null;

      await prisma.correoPendiente.update({
        where: { id: correo.id },
        data: {
          estado: siguiente ? "PENDIENTE" : "FALLIDO",
          texto: siguiente ? undefined : "",
          proximoIntentoEn: siguiente,
          reclamadoEn: null,
          error: mensaje,
        },
      });
      console.error("Falló la entrega de un correo transaccional.", {
        correoId: correo.id,
        intento: correo.intentos,
        reintentara: Boolean(siguiente),
        error: mensaje,
      });
    }
  }
}
