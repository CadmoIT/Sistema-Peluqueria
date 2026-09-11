/** Expone Prisma como infraestructura compartida para todos los módulos funcionales. */
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class DatosModule {}
