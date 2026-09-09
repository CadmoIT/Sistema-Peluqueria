/** Conecta el controlador y las reglas comerciales de facturación. */
import { Module } from "@nestjs/common";
import { FacturacionController } from "../controllers/facturacion.controller";
import { FacturacionService } from "../services/facturacion.service";

@Module({
  controllers: [FacturacionController],
  providers: [FacturacionService],
})
export class FacturacionModule {}
