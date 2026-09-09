/** Configura Swagger y publica la documentación navegable de la API. */
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configurarDocumentacion(app: INestApplication) {
  const opciones = new DocumentBuilder()
    .setTitle("TurnosRápidos API")
    .setDescription("Contrato público del SaaS multiempresa.")
    .setVersion("1.0")
    .addCookieAuth("sesion")
    .build();

  const documento = SwaggerModule.createDocument(app, opciones);
  SwaggerModule.setup("documentacion", app, documento);
}
