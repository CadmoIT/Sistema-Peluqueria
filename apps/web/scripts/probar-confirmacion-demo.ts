/** Prueba asistida: una única reserva nueva, sin pagos, para un destinatario autorizado. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function ejecutar() {
  const email = process.env.CARLA_PRUEBA_EMAIL;
  if (!email || process.env.CARLA_PRUEBA_CONFIRMAR !== "crear-una-reserva")
    throw new Error("Falta destinatario y confirmación de la prueba asistida.");
  const negocio = await db.negocio.findUniqueOrThrow({
    where: { slug: "carla-cicero-demo" },
  });
  if (!(negocio.configuracion as { demoCarla?: boolean })?.demoCarla)
    throw new Error("No es la demo esperada.");
  const observacion =
    "Prueba asistida de confirmación de correo — octubre 2026";
  const existente = await db.reserva.findFirst({
    where: { negocioId: negocio.id, notas: observacion, cliente: { email } },
  });
  if (existente) {
    console.log(JSON.stringify({ codigo: existente.codigo, existente: true }));
    return;
  }
  const servicio = await db.servicio.findFirstOrThrow({
    where: {
      negocioId: negocio.id,
      activo: true,
      profesionales: { some: { profesional: { activo: true } } },
    },
    include: {
      sedes: true,
      profesionales: { include: { profesional: { include: { sedes: true } } } },
    },
  });
  const profesional = servicio.profesionales.find(
    (p) =>
      p.profesional.activo &&
      p.profesional.sedes.some((s) =>
        servicio.sedes.some((t) => t.sedeId === s.sedeId),
      ),
  )?.profesional;
  if (!profesional) throw new Error("No hay profesional disponible.");
  const sedeId = profesional.sedes.find((s) =>
    servicio.sedes.some((t) => t.sedeId === s.sedeId),
  )!.sedeId;
  const origin = "https://carla-cicero-demo.turnosrapidos.com.ar";
  for (let dia = 1; dia <= 10; dia++) {
    const fecha = new Date();
    fecha.setUTCDate(fecha.getUTCDate() + dia);
    const parametros = new URLSearchParams({
      slug: negocio.slug,
      servicioIds: servicio.id,
      sedeId,
      profesionalId: profesional.id,
      fecha: fecha.toISOString().slice(0, 10),
    });
    const respuesta = await fetch(
      `${origin}/api/reservas-publicas/disponibilidad?${parametros}`,
    );
    if (!respuesta.ok) throw new Error(`Disponibilidad: ${respuesta.status}`);
    const { horarios } = (await respuesta.json()) as {
      horarios: { inicio: string }[];
    };
    if (!horarios.length) continue;
    const reserva = await fetch(`${origin}/api/reservas-publicas`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: negocio.slug,
        servicioIds: [servicio.id],
        sedeId,
        profesionalId: profesional.id,
        inicio: horarios[0]!.inicio,
        nombre: "Rocco",
        apellido: "Cicero",
        email,
        observacion,
      }),
    });
    if (!reserva.ok)
      throw new Error(`Reserva: ${reserva.status} ${await reserva.text()}`);
    console.log(JSON.stringify(await reserva.json()));
    return;
  }
  throw new Error("No se encontró un horario disponible.");
}
void ejecutar()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
