/** Construye el estado liviano que consumen monitoreo y despliegues. */
import { Injectable } from "@nestjs/common";

@Injectable()
export class SaludService {
  obtenerEstado() {
    return {
      estado: "ok",
      servicio: "api",
      marca: process.env.MARCA_APP ?? "TurnosRápidos",
      fecha: new Date().toISOString(),
    };
  }
}
