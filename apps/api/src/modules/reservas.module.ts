/** Conecta las capas necesarias para atender operaciones de reservas. */
import { Module } from "@nestjs/common";
import { ReservasController } from "../controllers/reservas.controller";
import { RESERVAS_REPOSITORY } from "../repositories/contracts/reservas.repository";
import { ReservasPrismaRepository } from "../repositories/prisma/reservas-prisma.repository";
import { ReservasService } from "../services/reservas.service";
import { DatosModule } from "./datos.module";

@Module({
  imports: [DatosModule],
  controllers: [ReservasController],
  providers: [
    ReservasService,
    {
      provide: RESERVAS_REPOSITORY,
      useClass: ReservasPrismaRepository,
    },
  ],
  exports: [ReservasService],
})
export class ReservasModule {}
