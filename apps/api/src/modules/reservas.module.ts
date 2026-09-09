/** Conecta las capas necesarias para atender operaciones de reservas. */
import { Module } from "@nestjs/common";
import { ReservasController } from "../controllers/reservas.controller";
import { RESERVAS_REPOSITORY } from "../repositories/contracts/reservas.repository";
import { ReservasMemoriaRepository } from "../repositories/memory/reservas-memoria.repository";
import { ReservasService } from "../services/reservas.service";

@Module({
  controllers: [ReservasController],
  providers: [
    ReservasService,
    {
      provide: RESERVAS_REPOSITORY,
      useClass: ReservasMemoriaRepository,
    },
  ],
  exports: [ReservasService],
})
export class ReservasModule {}
