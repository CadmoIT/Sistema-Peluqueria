/** Bitácora común con consultas separadas para no recuperar detalles financieros ajenos. */
import { prisma } from "@/lib/prisma";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { lecturasEquipo } from "@/servicios/lecturas-equipo.service";
import { anularOperacion } from "./acciones";
export default async function Actividad({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string;
    local?: string;
    integrante?: string;
    tipo?: string;
  }>;
}) {
  const c = await requerirContextoPanel(),
    p = await searchParams;
  const empleado = c.identidad.rol === "PROFESIONAL";
  const [sedes, integrantes] = await Promise.all([
    lecturasEquipo(c).sede.findMany({
      where: { negocioId: c.negocio.id, activa: true },
      select: { id: true, nombre: true },
    }),
    prisma.membresia.findMany({
      where: { negocioId: c.negocio.id },
      select: { usuarioId: true, usuario: { select: { nombre: true } } },
    }),
  ]);
  const desde =
    p.desde &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.desde) &&
    !Number.isNaN(Date.parse(p.desde))
      ? new Date(p.desde)
      : new Date(Date.now() - 30 * 86400_000);
  const where = {
    negocioId: c.negocio.id,
    creadaEn: { gte: desde },
    AND: [
      ...(empleado
        ? [
            {
              OR: [
                { sedeId: { in: c.identidad.sedeIds } },
                {
                  profesionalId: c.identidad.profesionalId,
                  visibilidad: "PERSONAL",
                },
              ],
            },
          ]
        : []),
      ...(p.local ? [{ sedeId: p.local }] : []),
    ],
    ...(p.integrante ? { usuarioId: p.integrante } : {}),
    ...(p.tipo ? { recurso: p.tipo } : {}),
  };
  const visibles = await prisma.auditoria.findMany({
    where: {
      ...where,
      ...(empleado
        ? {
            OR: [
              { visibilidad: "COMPARTIDA" },
              { profesionalId: c.identidad.profesionalId },
            ],
          }
        : {}),
    },
    orderBy: { creadaEn: "desc" },
    take: 100,
  });
  const ajenas = empleado
    ? await prisma.auditoria.findMany({
        where: {
          ...where,
          visibilidad: "PERSONAL",
          NOT: { profesionalId: c.identidad.profesionalId },
        },
        select: {
          id: true,
          accion: true,
          recurso: true,
          creadaEn: true,
          actorNombre: true,
          usuarioId: true,
          sedeId: true,
        },
        orderBy: { creadaEn: "desc" },
        take: 100,
      })
    : [];
  const filas = [...visibles, ...ajenas]
    .sort((a, b) => b.creadaEn.getTime() - a.creadaEn.getTime())
    .slice(0, 100);
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/actividad" />
      <h1>Actividad</h1>
      <p>
        Quién hizo cada operación. Las ventas y notas privadas de otros
        integrantes no se muestran.
      </p>
      <form method="get" className="formulario-apilado">
        <label>
          Desde
          <input type="date" name="desde" defaultValue={p.desde} />
        </label>
        <label>
          Local
          <select name="local" defaultValue={p.local ?? ""}>
            <option value="">Todos mis locales</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Integrante
          <select name="integrante" defaultValue={p.integrante ?? ""}>
            <option value="">Todos</option>
            {integrantes.map((i) => (
              <option key={i.usuarioId} value={i.usuarioId}>
                {i.usuario.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select name="tipo" defaultValue={p.tipo ?? ""}>
            <option value="">Todos</option>
            {["venta", "compra", "cobro", "stock", "reserva", "cliente"].map(
              (t) => (
                <option key={t}>{t}</option>
              ),
            )}
          </select>
        </label>
        <button>Filtrar</button>
      </form>
      {filas.map((f) => (
        <article key={f.id} className="equipo-operacion">
          <strong>{f.accion.replaceAll("_", " ")}</strong>
          <p>
            {f.actorNombre || "Autor desconocido"} ·{" "}
            {f.creadaEn.toLocaleString("es-AR", {
              timeZone: c.negocio.zonaHoraria,
            })}
          </p>
          {"detalle" in f && Boolean(f.detalle) && (
            <p>
              {Object.entries(f.detalle as Record<string, unknown>)
                .filter(([k]) => k !== "hash")
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(" · ")}
            </p>
          )}
          {c.membresia.rol === "DUENO" &&
            "recursoId" in f &&
            typeof f.recursoId === "string" &&
            Boolean(f.recursoId) &&
            [
              "REGISTRAR_VENTA",
              "REGISTRAR_COMPRA",
              "COBRAR_TURNO",
              "CONSUMO_STOCK",
              "INGRESO_MANUAL",
            ].includes(f.accion) && (
              <details>
                <summary>Anular / corregir</summary>
                <FormularioAccion
                  accion={anularOperacion}
                  texto="Anular registro"
                  className="formulario-apilado"
                >
                  <input type="hidden" name="tipo" value={f.recurso} />
                  <input type="hidden" name="id" value={String(f.recursoId)} />
                  <label>
                    Motivo
                    <input required name="motivo" maxLength={200} />
                  </label>
                  <small>
                    Se conserva el original y se genera un contramovimiento.
                    Para corregir, registrá luego la operación correcta. No
                    devuelve dinero en Mercado Pago.
                  </small>
                </FormularioAccion>
              </details>
            )}
        </article>
      ))}
      {!filas.length && <p>No hay actividad para estos filtros.</p>}
    </div>
  );
}
