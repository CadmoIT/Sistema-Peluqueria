/** Conecta el controlador, el servicio y el repositorio del área de negocios. */
import { Module } from "@nestjs/common";
import { NegociosController } from "../controllers/negocios.controller";
import { NEGOCIOS_REPOSITORY } from "../repositories/contracts/negocios.repository";
import { NegociosPrismaRepository } from "../repositories/prisma/negocios-prisma.repository";
import { NegociosService } from "../services/negocios.service";

@Module({
  controllers: [NegociosController],
  providers: [
    NegociosService,
    {
      provide: NEGOCIOS_REPOSITORY,
      useClass: NegociosPrismaRepository,
    },
  ],
  exports: [NegociosService],
})
export class NegociosModule {}
