/** Conecta recepción, validación e idempotencia de eventos externos. */
import { Module } from "@nestjs/common";
import { IntegracionesController } from "../controllers/integraciones.controller";
import { EVENTOS_REPOSITORY } from "../repositories/contracts/eventos.repository";
import { EventosMemoriaRepository } from "../repositories/memory/eventos-memoria.repository";
import { IntegracionesService } from "../services/integraciones.service";

@Module({
  controllers: [IntegracionesController],
  providers: [
    IntegracionesService,
    {
      provide: EVENTOS_REPOSITORY,
      useClass: EventosMemoriaRepository,
    },
  ],
})
export class IntegracionesModule {}
