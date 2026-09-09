/** Abre el flujo seguro de seleccion y confirmacion del turno. */
import { FlujoReserva } from "../../../componentes/reservas/flujo-reserva";

export const metadata = { title: "Reservar turno" };

export default async function PaginaReserva({
  searchParams,
}: {
  searchParams: Promise<{ servicios?: string }>;
}) {
  const parametros = await searchParams;
  return (
    <FlujoReserva
      servicioIds={(parametros.servicios ?? "").split(",").filter(Boolean)}
    />
  );
}
