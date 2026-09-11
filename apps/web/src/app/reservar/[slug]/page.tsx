/** Carga los datos publicados necesarios para iniciar una reserva real. */
import { notFound } from "next/navigation";
import { FlujoReserva } from "@/componentes/reservas/flujo-reserva";
import { obtenerSitioPublico } from "@/servicios/panel-datos.service";

export const metadata = { title: "Reservar turno" };
export default async function PaginaReserva({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ servicios?: string }>;
}) {
  const [{ slug }, consulta] = await Promise.all([params, searchParams]);
  const negocio = await obtenerSitioPublico(slug);
  if (
    !negocio ||
    !negocio.publicado ||
    !negocio.servicios.length ||
    !negocio.profesionales.length ||
    !negocio.sedes.length
  )
    notFound();
  return (
    <FlujoReserva
      slug={slug}
      nombreNegocio={negocio.nombre}
      politicaContacto={negocio.politicaContacto}
      servicioInicial={consulta.servicios?.split(",")[0]}
      servicios={negocio.servicios.map((servicio) => ({
        id: servicio.id,
        nombre: servicio.nombre,
        duracionMinutos: servicio.duracionMinutos,
        precio: Number(servicio.precio),
        sedeIds: servicio.sedes.map((asignacion) => asignacion.sedeId),
        profesionalIds: servicio.profesionales.map(
          (asignacion) => asignacion.profesionalId,
        ),
      }))}
      profesionales={negocio.profesionales.map((profesional) => ({
        id: profesional.id,
        nombre: `${profesional.nombre} ${profesional.apellido ?? ""}`.trim(),
        sedeIds: profesional.sedes.map((asignacion) => asignacion.sedeId),
        servicioIds: profesional.servicios.map(
          (asignacion) => asignacion.servicioId,
        ),
      }))}
      sedes={negocio.sedes.map((sede) => ({
        id: sede.id,
        nombre: sede.nombre,
        direccion: sede.direccion,
      }))}
    />
  );
}
