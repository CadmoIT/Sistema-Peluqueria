/** Compone los módulos funcionales y los middlewares globales de la API. */
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { IdSolicitudMiddleware } from "./middlewares/id-solicitud.middleware";
import { FacturacionModule } from "./modules/facturacion.module";
import { IntegracionesModule } from "./modules/integraciones.module";
import { NegociosModule } from "./modules/negocios.module";
import { ReservasModule } from "./modules/reservas.module";
import { SaludModule } from "./modules/salud.module";

@Module({
  imports: [
    SaludModule,
    NegociosModule,
    ReservasModule,
    FacturacionModule,
    IntegracionesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IdSolicitudMiddleware).forRoutes("{*path}");
  }
}
