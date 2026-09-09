/** Conecta el endpoint de salud con su servicio liviano. */
import { Module } from "@nestjs/common";
import { SaludController } from "../controllers/salud.controller";
import { SaludService } from "../services/salud.service";

@Module({
  controllers: [SaludController],
  providers: [SaludService],
})
export class SaludModule {}
