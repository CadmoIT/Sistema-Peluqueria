-- Amplía el modelo para el panel funcional, la prueba pública y las integraciones del negocio.
CREATE TYPE "PoliticaContacto" AS ENUM ('EMAIL', 'TELEFONO', 'CUALQUIERA', 'NINGUNO');
CREATE TYPE "EstadoConexionGoogle" AS ENUM ('PENDIENTE', 'ACTIVA', 'ERROR', 'REVOCADA');

ALTER TABLE "Negocio" ADD COLUMN "politicaContacto" "PoliticaContacto" NOT NULL DEFAULT 'CUALQUIERA';
ALTER TABLE "Sede" ADD COLUMN "googlePlaceId" TEXT, ADD COLUMN "googlePuntaje" DECIMAL(2,1), ADD COLUMN "googleResenas" INTEGER, ADD COLUMN "googleMapsUrl" TEXT, ADD COLUMN "googleActualizadoEn" TIMESTAMP(3);
ALTER TABLE "Profesional" ADD COLUMN "apellido" TEXT, ADD COLUMN "especialidad" TEXT;
DROP INDEX IF EXISTS "Cliente_negocioId_telefono_key";
ALTER TABLE "Cliente" ALTER COLUMN "nombre" DROP NOT NULL, ALTER COLUMN "telefono" DROP NOT NULL, ADD COLUMN "apellido" TEXT;
CREATE INDEX "Cliente_negocioId_telefono_idx" ON "Cliente"("negocioId", "telefono");
ALTER TABLE "Suscripcion" ADD COLUMN "pruebaIniciaEn" TIMESTAMP(3), ADD COLUMN "pruebaFinalizaEn" TIMESTAMP(3);

CREATE TABLE "ConfiguracionSitio" ("id" TEXT NOT NULL, "negocioId" TEXT NOT NULL, "borrador" JSONB NOT NULL, "publicada" JSONB, "version" INTEGER NOT NULL DEFAULT 0, "publicadaEn" TIMESTAMP(3), "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "ConfiguracionSitio_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ConfiguracionSitio_negocioId_key" ON "ConfiguracionSitio"("negocioId");
ALTER TABLE "ConfiguracionSitio" ADD CONSTRAINT "ConfiguracionSitio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConexionGoogleCalendar" ("id" TEXT NOT NULL, "negocioId" TEXT NOT NULL, "profesionalId" TEXT, "sedeId" TEXT, "nombre" TEXT NOT NULL, "calendarioId" TEXT, "accessTokenCifrado" TEXT, "refreshTokenCifrado" TEXT, "alcance" TEXT, "syncToken" TEXT, "estado" "EstadoConexionGoogle" NOT NULL DEFAULT 'PENDIENTE', "ultimoError" TEXT, "sincronizadoEn" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "ConexionGoogleCalendar_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ConexionGoogleCalendar_negocioId_estado_idx" ON "ConexionGoogleCalendar"("negocioId", "estado");
CREATE INDEX "ConexionGoogleCalendar_profesionalId_idx" ON "ConexionGoogleCalendar"("profesionalId");
ALTER TABLE "ConexionGoogleCalendar" ADD CONSTRAINT "ConexionGoogleCalendar_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConexionGoogleCalendar" ADD CONSTRAINT "ConexionGoogleCalendar_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConexionGoogleCalendar" ADD CONSTRAINT "ConexionGoogleCalendar_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EventoCalendarioExterno" ("id" TEXT NOT NULL, "conexionId" TEXT NOT NULL, "eventoId" TEXT NOT NULL, "inicio" TIMESTAMPTZ NOT NULL, "fin" TIMESTAMPTZ NOT NULL, "cancelado" BOOLEAN NOT NULL DEFAULT false, "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "EventoCalendarioExterno_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "EventoCalendarioExterno_conexionId_eventoId_key" ON "EventoCalendarioExterno"("conexionId", "eventoId");
CREATE INDEX "EventoCalendarioExterno_conexionId_inicio_fin_idx" ON "EventoCalendarioExterno"("conexionId", "inicio", "fin");
ALTER TABLE "EventoCalendarioExterno" ADD CONSTRAINT "EventoCalendarioExterno_conexionId_fkey" FOREIGN KEY ("conexionId") REFERENCES "ConexionGoogleCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Completa negocios creados antes de incorporar la prueba y el editor persistente.
INSERT INTO "Suscripcion" ("id", "negocioId", "plan", "estado", "precioMensual", "cancelarAlFinal", "pruebaIniciaEn", "pruebaFinalizaEn")
SELECT CONCAT('sub_', MD5(RANDOM()::TEXT || n."id")), n."id", 'PRUEBA', 'CONFIGURACION_GRATUITA', 0, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days'
FROM "Negocio" n LEFT JOIN "Suscripcion" s ON s."negocioId" = n."id" WHERE s."id" IS NULL;
INSERT INTO "ConfiguracionSitio" ("id", "negocioId", "borrador", "publicada", "version", "publicadaEn", "actualizadoEn")
SELECT CONCAT('sit_', MD5(RANDOM()::TEXT || n."id")), n."id", jsonb_build_object('titulo', n."nombre", 'descripcion', COALESCE(n."descripcion", 'Reservá tu próximo turno de forma simple y rápida.'), 'colorPrincipal', '#126783', 'colorFondo', '#ffffff', 'colorTexto', '#111111', 'logoUrl', '', 'whatsapp', COALESCE(n."telefono", ''), 'instagram', '', 'hero', '[]'::jsonb, 'carruselAutomatico', true, 'secciones', jsonb_build_array('servicios', 'equipo', 'ubicacion')), jsonb_build_object('titulo', n."nombre", 'descripcion', COALESCE(n."descripcion", 'Reservá tu próximo turno de forma simple y rápida.'), 'colorPrincipal', '#126783', 'colorFondo', '#ffffff', 'colorTexto', '#111111', 'logoUrl', '', 'whatsapp', COALESCE(n."telefono", ''), 'instagram', '', 'hero', '[]'::jsonb, 'carruselAutomatico', true, 'secciones', jsonb_build_array('servicios', 'equipo', 'ubicacion')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Negocio" n LEFT JOIN "ConfiguracionSitio" c ON c."negocioId" = n."id" WHERE c."id" IS NULL;
UPDATE "Negocio" SET "publicado" = true WHERE "publicado" = false;
