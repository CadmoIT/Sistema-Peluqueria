/** Audita avisos sin mostrar destinatarios; habilita sólo reservas nuevas con confirmación explícita. */
import { PrismaClient, Prisma } from "@prisma/client";
const db = new PrismaClient();
async function ejecutar() {
  const negocio = await db.negocio.findUnique({
    where: { slug: "carla-cicero-demo" },
    include: { configuracionAvisos: true },
  });
  if (
    !negocio ||
    (negocio.configuracion as { demoCarla?: boolean } | null)?.demoCarla !==
      true
  )
    throw new Error("No se encontró la demo esperada.");
  if (process.argv.includes("--habilitar")) {
    if (process.env.CARLA_CONFIRMACION_ENABLE !== "solo-nuevas-reservas")
      throw new Error("Falta confirmación para habilitar avisos.");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id"=${negocio.id} FOR UPDATE`;
      const actual = await tx.negocio.findUniqueOrThrow({
        where: { id: negocio.id },
      });
      const config = actual.configuracion as Record<
        string,
        Prisma.InputJsonValue
      >;
      const anterior =
        typeof config.demoCarlaConfirmacionesDesde === "string"
          ? new Date(config.demoCarlaConfirmacionesDesde)
          : null;
      const desde =
        anterior && Number.isFinite(anterior.getTime()) ? anterior : new Date();
      await tx.negocio.update({
        where: { id: negocio.id },
        data: {
          configuracion: {
            ...config,
            demoCarlaConfirmacionesDesde: desde.toISOString(),
          },
          versionEquipo: { increment: 1 },
        },
      });
      const data = {
        emailConfirmacionActivo: true,
        emailRecordatorioActivo: false,
        whatsappConfirmacionActivo: false,
        whatsappRecordatorioActivo: false,
      };
      await tx.configuracionAvisos.upsert({
        where: { negocioId: negocio.id },
        create: { negocioId: negocio.id, ...data },
        update: data,
      });
      await tx.avisoReserva.updateMany({
        where: {
          negocioId: negocio.id,
          canal: "EMAIL",
          estado: { in: ["PENDIENTE", "ENVIANDO"] },
          reserva: { creadoEn: { lt: desde } },
        },
        data: {
          estado: "OMITIDO",
          reclamadoEn: null,
          error:
            "Reserva anterior a la habilitación de confirmaciones de la demo.",
        },
      });
      await tx.auditoria.create({
        data: {
          negocioId: negocio.id,
          accion: "HABILITAR_CONFIRMACIONES_DEMO",
          recurso: "avisos",
          visibilidad: "COMPARTIDA",
          actorNombre: "Configuración asistida",
          detalle: { desde: desde.toISOString(), soloReservasNuevas: true },
        },
      });
    });
  }
  const ajustes = await db.configuracionAvisos.findUnique({
    where: { negocioId: negocio.id },
    select: { emailConfirmacionActivo: true, emailRecordatorioActivo: true },
  });
  const avisos = await db.avisoReserva.groupBy({
    by: ["estado", "tipo"],
    where: { negocioId: negocio.id },
    _count: true,
  });
  const recientes = await db.reserva.findMany({
    where: {
      negocioId: negocio.id,
      cliente: { is: { email: { not: { endsWith: "@example.com" } } } },
    },
    orderBy: { creadoEn: "desc" },
    take: 3,
    select: {
      estado: true,
      creadoEn: true,
      cliente: { select: { email: true } },
    },
  });
  console.log(
    JSON.stringify({
      ajustes,
      avisos,
      reservasRecientes: recientes.map((r) => ({
        estado: r.estado,
        creadaEn: r.creadoEn,
        tieneEmail: Boolean(r.cliente?.email),
        emailFicticio: /@(?:.*\.)?example\.com$/i.test(r.cliente?.email ?? ""),
      })),
    }),
  );
}
void ejecutar()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
