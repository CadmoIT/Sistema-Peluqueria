/** Modela una reserva y concentra sus cambios de estado válidos. */
export type EstadoReserva = "RETENIDA" | "CONFIRMADA";

export type DatosClienteReserva = {
  nombre: string;
  email: string;
  telefono: string;
};

export type DatosReserva = {
  negocioSlug: string;
  sedeId: string;
  profesionalId: string;
  servicioIds: string[];
  inicio: string;
  cliente: DatosClienteReserva;
};

type CrearReservaRetenida = {
  id: string;
  codigo: string;
  claveHorario: string;
  venceEn: string;
  datos: DatosReserva;
};

export class Reserva {
  public estado: EstadoReserva = "RETENIDA";

  constructor(
    public readonly id: string,
    public readonly codigo: string,
    public readonly claveHorario: string,
    public readonly venceEn: string,
    public readonly datos: DatosReserva,
  ) {}

  static retenida(entrada: CrearReservaRetenida) {
    return new Reserva(
      entrada.id,
      entrada.codigo,
      entrada.claveHorario,
      entrada.venceEn,
      entrada.datos,
    );
  }

  confirmar() {
    this.estado = "CONFIRMADA";
  }

  estaVencida(fechaActual = new Date()) {
    return (
      this.estado === "RETENIDA" &&
      new Date(this.venceEn).getTime() < fechaActual.getTime()
    );
  }
}
