/** Historial paginado: el empleado sólo consulta turnos y notas de su profesional. */
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { lecturasEquipo } from "@/servicios/lecturas-equipo.service";
export default async function HistorialCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const c = await requerirContextoPanel(),
    { id } = await params,
    p = await searchParams,
    db = lecturasEquipo(c);
  const cliente = await db.cliente.findFirst({
    where: { id, negocioId: c.negocio.id },
  });
  if (!cliente) notFound();
  const pagina = Math.max(
    1,
    Math.min(
      100000,
      Number.isSafeInteger(Number(p.pagina)) ? Number(p.pagina) : 1,
    ),
  );
  const [turnos, total, notas] = await Promise.all([
    db.reserva.findMany({
      where: { negocioId: c.negocio.id, clienteId: id },
      select: {
        id: true,
        inicio: true,
        estado: true,
        notas: true,
        profesional: { select: { nombre: true } },
        servicios: { select: { servicio: { select: { nombre: true } } } },
      },
      orderBy: { inicio: "desc" },
      skip: (pagina - 1) * 30,
      take: 30,
    }),
    db.reserva.count({ where: { negocioId: c.negocio.id, clienteId: id } }),
    prisma.profesionalCliente.findMany({
      where: {
        clienteId: id,
        profesional: { negocioId: c.negocio.id },
        ...(c.identidad.rol === "PROFESIONAL"
          ? { profesionalId: c.identidad.profesionalId! }
          : {}),
      },
      select: {
        profesionalId: true,
        notas: true,
        profesional: { select: { nombre: true } },
      },
    }),
  ]);
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta={`/panel/clientes/${id}`} />
      <Link href="/panel/clientes">← Clientes</Link>
      <h1>
        {[cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
          "Historial del cliente"}
      </h1>
      <p>
        {cliente.email} · {cliente.telefono}
      </p>
      <h2>
        {c.identidad.rol === "PROFESIONAL"
          ? "Mis turnos con este cliente"
          : "Historial de turnos"}
      </h2>
      {turnos.map((t) => (
        <article className="equipo-operacion" key={t.id}>
          <strong>
            {t.inicio.toLocaleString("es-AR", {
              timeZone: c.negocio.zonaHoraria,
            })}
          </strong>
          <p>
            {t.servicios.map((s) => s.servicio.nombre).join(" · ")} · {t.estado}
            {c.identidad.rol !== "PROFESIONAL" &&
              ` · ${t.profesional?.nombre ?? "Profesional no disponible"}`}
          </p>
          {t.notas && <p>{t.notas}</p>}
        </article>
      ))}
      {!turnos.length && <p>No hay turnos para mostrar.</p>}
      <nav aria-label="Páginas del historial">
        {pagina > 1 && <Link href={`?pagina=${pagina - 1}`}>← Anterior</Link>}
        <span> Página {pagina} </span>
        {pagina * 30 < total && (
          <Link href={`?pagina=${pagina + 1}`}>Siguiente →</Link>
        )}
      </nav>
      <h2>Notas</h2>
      {notas.map((n) => (
        <p key={n.profesionalId}>
          {c.identidad.rol !== "PROFESIONAL" && `${n.profesional.nombre}: `}
          {n.notas || "Sin notas personales"}
        </p>
      ))}
      {c.identidad.rol !== "PROFESIONAL" && cliente.notas && (
        <p>Nota histórica: {cliente.notas}</p>
      )}
    </div>
  );
}
