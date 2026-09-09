/** Verifica el armado del módulo y las reglas principales del servicio de reservas. */
import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReservasModule } from "../modules/reservas.module";
import { ReservasMemoriaRepository } from "../repositories/memory/reservas-memoria.repository";
import { ReservasService } from "../services/reservas.service";

const datosReserva = {
  negocioSlug: "manly-barber",
  sedeId: "palermo",
  profesionalId: "franco",
  servicioIds: ["corte"],
  inicio: "2026-09-10T15:00:00.000Z",
  cliente: {
    nombre: "Cliente",
    email: "cliente@example.com",
    telefono: "1112345678",
  },
};

describe("ReservasModule", () => {
  it("se puede compilar de manera aislada", async () => {
    const modulo = await Test.createTestingModule({
      imports: [ReservasModule],
    }).compile();

    expect(modulo).toBeDefined();
    await modulo.close();
  });

  it("rechaza dos retenciones para el mismo profesional y horario", async () => {
    const repositorio = new ReservasMemoriaRepository();
    const servicio = new ReservasService(repositorio);

    await servicio.crear(datosReserva);

    await expect(servicio.crear(datosReserva)).rejects.toThrow(
      ConflictException,
    );
  });
});
