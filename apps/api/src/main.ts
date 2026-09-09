/** Inicia la API y delega cada configuración transversal en un archivo específico. */
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { cargarConfiguracionApi } from "./config/api.config";
import { configurarDocumentacion } from "./config/swagger.config";

async function iniciarApi() {
  // Escucha el puerto 3001 y acepta solicitudes desde http://localhost:3000 (donde corre la app web)
  const configuracion = cargarConfiguracionApi();
  // Crea la app nestJS
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Agrega encabezados HTTP de seguridad y habilita CORS para la URL de la app web
  app.use(helmet());
  app.enableCors({
    origin: configuracion.webUrl,
    credentials: true,
  });

  // Configura el prefijo de la API y las rutas que no deberían tenerlo
  app.setGlobalPrefix("api/v1", {
    exclude: ["salud", "webhooks/mercadopago", "webhooks/meta"],
  });

  // Procesa y valida datos antes de que lleguen al controller. Por ejemplo, convierte strings a números y rechaza propiedades que no estén en el DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configura la documentación de la API (Swagger)
  configurarDocumentacion(app);
  await app.listen(configuracion.puerto, "0.0.0.0");
}

void iniciarApi();
