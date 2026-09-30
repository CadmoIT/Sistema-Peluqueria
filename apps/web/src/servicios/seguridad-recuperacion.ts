/** Funciones criptográficas independientes para el flujo de recuperación. */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { obtenerSecretoAutenticacion } from "@/lib/secreto-autenticacion";

const CLAVE_CIFRADO = createHmac("sha256", obtenerSecretoAutenticacion())
  .update("turnosrapidos-recuperacion-contrasena:v1")
  .digest();

const INTERVALO_ENVIO_MS = 60_000;
const VENTANA_ENVIO_MS = 60 * 60_000;
const MAX_ENVIO_POR_VENTANA = 5;

export function evaluarLimiteEnvioRecuperacion(
  estado: {
    ventanaDesde: Date | null;
    envios: number;
    ultimoEnvio: Date | null;
  },
  ahora = new Date(),
) {
  const ventanaVencida =
    !estado.ventanaDesde ||
    ahora.getTime() - estado.ventanaDesde.getTime() >= VENTANA_ENVIO_MS;
  const ventanaDesde = ventanaVencida ? ahora : estado.ventanaDesde!;
  const envios = ventanaVencida ? 0 : estado.envios;
  const esperaVentana = Math.max(
    0,
    ventanaDesde.getTime() + VENTANA_ENVIO_MS - ahora.getTime(),
  );
  const esperaCooldown = estado.ultimoEnvio
    ? Math.max(
        0,
        estado.ultimoEnvio.getTime() + INTERVALO_ENVIO_MS - ahora.getTime(),
      )
    : 0;

  if (envios >= MAX_ENVIO_POR_VENTANA) {
    return {
      permitido: false,
      reintentarEn: Math.ceil(esperaVentana / 1000),
      ventanaDesde,
      envios,
    };
  }
  if (esperaCooldown > 0) {
    return {
      permitido: false,
      reintentarEn: Math.ceil(esperaCooldown / 1000),
      ventanaDesde,
      envios,
    };
  }
  return { permitido: true, reintentarEn: 60, ventanaDesde, envios };
}

export function normalizarEmailRecuperacion(email: string) {
  return email.trim().toLowerCase();
}

export function huellaEmailRecuperacion(email: string) {
  return crearHuella(normalizarEmailRecuperacion(email));
}

export function crearHuella(valor: string) {
  return createHmac("sha256", obtenerSecretoAutenticacion())
    .update(valor)
    .digest("hex");
}

export function generarCodigoRecuperacion() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generarTokenRecuperacion() {
  return randomBytes(32).toString("base64url");
}

export function cifrarDatoRecuperacion(valor: string) {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", CLAVE_CIFRADO, iv);
  const contenido = Buffer.concat([
    cifrador.update(valor, "utf8"),
    cifrador.final(),
  ]);
  return [iv, cifrador.getAuthTag(), contenido]
    .map((parte) => parte.toString("base64url"))
    .join(".");
}

export function descifrarDatoRecuperacion(valorCifrado: string) {
  const [ivCodificado, etiquetaCodificada, contenidoCodificado] =
    valorCifrado.split(".");
  if (!ivCodificado || !etiquetaCodificada || !contenidoCodificado) {
    throw new Error("El dato de recuperación almacenado no es válido.");
  }
  const descifrador = createDecipheriv(
    "aes-256-gcm",
    CLAVE_CIFRADO,
    Buffer.from(ivCodificado, "base64url"),
  );
  descifrador.setAuthTag(Buffer.from(etiquetaCodificada, "base64url"));
  return Buffer.concat([
    descifrador.update(Buffer.from(contenidoCodificado, "base64url")),
    descifrador.final(),
  ]).toString("utf8");
}

export function compararHuellaSegura(esperada: string, recibida: string) {
  const a = Buffer.from(esperada, "hex");
  const b = Buffer.from(recibida, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function firmarPermisoSolicitud(emailHash: string, timestamp: number) {
  return createHmac("sha256", obtenerSecretoAutenticacion())
    .update(`${emailHash}:${timestamp}`)
    .digest("hex");
}

export function validarPermisoSolicitud(
  permiso: string | null,
  emailHash: string,
  ahora = Date.now(),
) {
  if (!permiso) return false;
  const [timestampCrudo, firma] = permiso.split(".");
  const timestamp = Number(timestampCrudo);
  if (
    !Number.isSafeInteger(timestamp) ||
    !firma ||
    Math.abs(ahora - timestamp) > 120_000
  ) {
    return false;
  }
  return compararHuellaSegura(
    firmarPermisoSolicitud(emailHash, timestamp),
    firma,
  );
}
