/** Aplica aislamiento antes de consultar, incluyendo relaciones y agregaciones del panel. */
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type { ContextoEquipo } from "./contexto-equipo.service";
export function lecturasEquipo(
  c: ContextoEquipo,
  db: PrismaClient = prisma,
): typeof prisma {
  if (c.identidad.rol !== "PROFESIONAL") return db;
  const profesionalId = c.identidad.profesionalId!;
  const sede = { in: c.identidad.sedeIds };
  const filtros: Record<string, object> = {
    Reserva: { profesionalId, sedeId: sede },
    BloqueoAgenda: { profesionalId },
    Profesional: { id: profesionalId },
    Sede: { id: sede },
    Cliente: { profesionales: { some: { profesionalId } } },
    MovimientoCaja: { profesionalId, sedeId: sede },
    Venta: { profesionalId, sedeId: sede },
    Compra: { sedeId: sede },
    Existencia: { sedeId: sede },
    ConexionGoogleCalendar: { profesionalId },
    EventoCalendarioExterno: {
      conexion: { negocioId: c.negocio.id, profesionalId },
    },
    Producto: { existencias: { some: { sedeId: sede } } },
    Servicio: {
      OR: [{ sedes: { none: {} } }, { sedes: { some: { sedeId: sede } } }],
    },
    CategoriaServicio: {},
    ColumnaInventario: {},
    Membresia: { usuarioId: c.usuario.id, activo: true },
  };
  return db.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!/^(find|count|aggregate|groupBy)/.test(operation))
            throw new Error("Esta conexión sólo permite lecturas.");
          const filtro = filtros[model];
          if (!filtro)
            throw new Error("Consulta no habilitada para tu cuenta.");
          const opciones = args as {
            where?: object;
            select?: Record<string, unknown>;
            include?: Record<string, unknown>;
          };
          const pertenencia =
            model === "EventoCalendarioExterno"
              ? {}
              : { negocioId: c.negocio.id };
          opciones.where = {
            ...(opciones.where ?? {}),
            AND: [opciones.where ?? {}, pertenencia, filtro],
          };
          const relaciones = opciones.include ?? opciones.select;
          if (model === "Cliente" && /find/.test(operation)) {
            if (opciones.select) opciones.select.notas = false;
            else
              opciones.select = {
                id: true,
                negocioId: true,
                nombre: true,
                apellido: true,
                email: true,
                telefono: true,
                aceptaWhatsapp: true,
                archivadoEn: true,
                consentimientoWhatsappEn: true,
                puntos: true,
                creadoEn: true,
              };
            opciones.select.profesionales = {
              where: { profesionalId },
              select: { notas: true },
            };
            delete opciones.include;
          }
          if (model === "Servicio" && relaciones?.profesionales)
            relaciones.profesionales = {
              where: { profesionalId },
              include: { profesional: true },
            };
          if (model === "Servicio" && relaciones?.sedes)
            relaciones.sedes = {
              where: { sedeId: sede },
              include: { sede: true },
            };
          if (model === "Producto" && relaciones?.existencias)
            relaciones.existencias = {
              where: { sedeId: sede },
              include: { sede: { select: { nombre: true } } },
            };
          const resultado = await query(args);
          if (model === "Cliente" && /find/.test(operation)) {
            const notasPropias = (fila: unknown) => {
              if (!fila || typeof fila !== "object") return fila;
              const datos = fila as Record<string, unknown>;
              const vinculaciones = datos.profesionales as
                Array<{ notas: string | null }> | undefined;
              return {
                ...datos,
                notas: vinculaciones?.[0]?.notas ?? null,
                profesionales: undefined,
              };
            };
            return Array.isArray(resultado)
              ? resultado.map(notasPropias)
              : notasPropias(resultado);
          }
          return resultado;
        },
      },
    },
  }) as unknown as typeof prisma;
}
