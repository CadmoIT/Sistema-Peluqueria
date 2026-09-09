/** Expone el catálogo comercial y prepara nuevas suscripciones. */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PAQUETES_WHATSAPP, PLANES } from "@turnos/config";
import type { ContratarPlanDto } from "../dto/facturacion/contratar-plan.dto";
import { crearSuscripcionPendiente } from "../factories/suscripcion.factory";

@Injectable()
export class FacturacionService {
  obtenerCatalogo() {
    return {
      moneda: "ARS",
      ivaIncluido: true,
      planes: PLANES,
      whatsapp: PAQUETES_WHATSAPP,
    };
  }

  contratar(datos: ContratarPlanDto) {
    const plan = PLANES.find((item) => item.id === datos.planId);

    if (!plan) {
      throw new NotFoundException("Plan no encontrado");
    }

    return crearSuscripcionPendiente(datos.negocioId, plan);
  }
}
