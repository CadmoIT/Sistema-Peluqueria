/** Procesa webhooks de forma idempotente antes de delegarlos al worker. */
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  EVENTOS_REPOSITORY,
  type EventosRepository,
} from "../repositories/contracts/eventos.repository";
import { coincideFirmaHmac } from "../validators/firma-webhook.validator";

@Injectable()
export class IntegracionesService {
  constructor(
    @Inject(EVENTOS_REPOSITORY)
    private readonly repositorio: EventosRepository,
  ) {}

  async recibirMercadoPago(
    contenido: Record<string, unknown>,
    firma?: string,
    requestId?: string,
  ) {
    const id = String(requestId ?? contenido.id ?? "");

    if (!id) {
      throw new UnauthorizedException("Evento sin identificador");
    }

    if (process.env.NODE_ENV === "production" && !firma) {
      throw new UnauthorizedException("Firma ausente");
    }

    return this.registrarUnaVez(`mercadopago:${id}`);
  }

  async recibirMeta(contenido: Record<string, unknown>, firma?: string) {
    const cuerpo = JSON.stringify(contenido);
    const firmaValida = coincideFirmaHmac(
      cuerpo,
      firma,
      process.env.META_APP_SECRET,
    );

    if (!firmaValida) {
      throw new UnauthorizedException("Firma inválida");
    }

    const id = createHash("sha256").update(cuerpo).digest("hex");
    return this.registrarUnaVez(`meta:${id}`);
  }

  private async registrarUnaVez(clave: string) {
    if (await this.repositorio.yaFueRecibido(clave)) {
      return { recibido: true, duplicado: true };
    }

    await this.repositorio.guardar(clave);
    return { recibido: true, duplicado: false };
  }
}
