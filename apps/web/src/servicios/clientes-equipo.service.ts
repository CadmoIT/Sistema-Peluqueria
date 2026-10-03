/** Reutiliza contactos exactos sin habilitar un explorador de clientes ajenos. */
import { Prisma } from "@prisma/client";
import type { ContextoEquipo } from "./contexto-equipo.service";
export async function vincularClienteEquipo(
  tx: Prisma.TransactionClient,
  profesionalId: string,
  clienteId: string,
) {
  const [p, c] = await Promise.all([
    tx.profesional.findUnique({
      where: { id: profesionalId },
      select: { negocioId: true },
    }),
    tx.cliente.findUnique({
      where: { id: clienteId },
      select: { negocioId: true },
    }),
  ]);
  if (!p || !c || p.negocioId !== c.negocioId)
    throw new Error("El cliente no pertenece a este negocio.");
  await tx.profesionalCliente.upsert({
    where: { profesionalId_clienteId: { profesionalId, clienteId } },
    create: { profesionalId, clienteId },
    update: {},
  });
}
export async function clienteParaTurnoEquipo(
  tx: Prisma.TransactionClient,
  c: ContextoEquipo,
  pId: string,
  e: { id: string; nombre: string; email: string; telefono: string },
) {
  const empleado = c.identidad.rol === "PROFESIONAL";
  const email = e.email.trim().toLowerCase(),
    telefono = e.telefono.replace(/[^+\d]/g, "");
  if (
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    email.length > 254 ||
    telefono.length > 30 ||
    e.nombre.length > 200
  )
    throw new Error("Revisá los datos del cliente.");
  const llave = [email, telefono].filter(Boolean).sort().join(":");
  if (llave)
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`cliente:${c.negocio.id}:${llave}`},0))::text`;
  let cliente;
  if (e.id)
    cliente = await tx.cliente.findFirst({
      where: {
        id: e.id,
        negocioId: c.negocio.id,
        ...(empleado
          ? { profesionales: { some: { profesionalId: pId } } }
          : {}),
      },
      select: { id: true },
    });
  else {
    const coincidencias =
      email || telefono
        ? await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Cliente" WHERE "negocioId" = ${c.negocio.id} AND (
        ${email ? Prisma.sql`LOWER(TRIM("email")) = ${email}` : Prisma.sql`FALSE`}
        OR ${telefono ? Prisma.sql`regexp_replace("telefono", '[^+0-9]', '', 'g') = ${telefono}` : Prisma.sql`FALSE`}
      ) ORDER BY "creadoEn" ASC LIMIT 2
    `)
        : [];
    if (coincidencias.length > 1)
      throw new Error(
        "El contacto coincide con varias fichas. Pedile al dueño que las revise.",
      );
    cliente =
      coincidencias[0] ??
      (await tx.cliente.create({
        data: {
          negocioId: c.negocio.id,
          nombre: e.nombre || null,
          email: email || null,
          telefono: telefono || null,
        },
        select: { id: true },
      }));
  }
  if (!cliente)
    throw new Error("El cliente no está disponible para tu cuenta.");
  await vincularClienteEquipo(tx, pId, cliente.id);
  return cliente;
}
