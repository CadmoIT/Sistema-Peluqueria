/** Bitácora común con consultas separadas para no recuperar detalles financieros ajenos. */
import { prisma } from "@/lib/prisma";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { lecturasEquipo } from "@/servicios/lecturas-equipo.service";
import { anularOperacion } from "./acciones";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { fechaLocalAUtc, sumarDias } from "@/servicios/disponibilidad.service";
const nombres: Record<string, string> = {
  REGISTRAR_VENTA: "Registró una venta",
  REGISTRAR_COMPRA: "Registró una compra",
  COBRAR_TURNO: "Registró un cobro",
  CONSUMO_STOCK: "Registró un consumo",
  INGRESO_MANUAL: "Registró un ingreso",
  ANULAR_OPERACION: "Anuló una operación",
  CAMBIAR_HORARIO: "Cambió su horario",
  BLOQUEAR_AGENDA: "Bloqueó un horario",
  ACEPTAR_INVITACION: "Se unió al equipo",
  CAMBIAR_DESCUENTO: "Actualizó el descuento de efectivo",
};
export default async function Actividad({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string;
    local?: string;
    integrante?: string;
    tipo?: string;
    dia?: string;
    antes?: string;
    cursor?: string;
  }>;
}) {
  const c = await requerirContextoPanel(),
    p = await searchParams;
  const empleado = c.identidad.rol === "PROFESIONAL";
  const [sedes, profesionales] = await Promise.all([
    lecturasEquipo(c).sede.findMany({
      where: { negocioId: c.negocio.id, activa: true },
      select: { id: true, nombre: true },
    }),
    lecturasEquipo(c).profesional.findMany({
      where: { negocioId: c.negocio.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        membresia: { select: { usuarioId: true } },
      },
    }),
  ]);
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: c.negocio.zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const solicitada = p.dia ?? p.desde;
  const dia =
    solicitada &&
    /^\d{4}-\d{2}-\d{2}$/.test(solicitada) &&
    !Number.isNaN(Date.parse(solicitada)) &&
    new Date(solicitada).toISOString().slice(0, 10) === solicitada
      ? solicitada
      : hoy;
  const desde = fechaLocalAUtc(dia, "00:00", c.negocio.zonaHoraria);
  const hasta = fechaLocalAUtc(
    sumarDias(dia, 1),
    "00:00",
    c.negocio.zonaHoraria,
  );
  const antes =
    p.antes && !Number.isNaN(Date.parse(p.antes)) ? new Date(p.antes) : null;
  function enlaceDia(valor: string) {
    const q = new URLSearchParams({ dia: valor });
    for (const k of ["integrante"] as const) if (p[k]) q.set(k, p[k]!);
    return `/panel/actividad?${q}`;
  }
  const where = {
    negocioId: c.negocio.id,
    creadaEn: { gte: desde, lt: hasta },
    AND: [
      ...(antes && p.cursor
        ? [
            {
              OR: [
                { creadaEn: { lt: antes } },
                { creadaEn: antes, id: { lt: p.cursor } },
              ],
            },
          ]
        : []),
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
      ...(p.integrante
        ? [
            {
              profesionalId: p.integrante,
            },
          ]
        : []),
    ],
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
    orderBy: [{ creadaEn: "desc" as const }, { id: "desc" as const }],
    take: 51,
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
        orderBy: [{ creadaEn: "desc" as const }, { id: "desc" as const }],
        take: 51,
      })
    : [];
  const filas = [...visibles, ...ajenas].sort(
    (a, b) =>
      b.creadaEn.getTime() - a.creadaEn.getTime() ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/actividad" />
      <h1>Actividad</h1>
      <nav className="actividad-dia" aria-label="Día de actividad">
        <form method="get">
          <label>
            Fecha
            <input
              type="date"
              name="dia"
              key={dia}
              defaultValue={dia}
              aria-label="Fecha de actividad"
              required
            />
          </label>
          <label>
            Persona
            <select
              key={p.integrante ?? ""}
              name="integrante"
              defaultValue={p.integrante ?? ""}
            >
              <option value="">Todos</option>
              {profesionales.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} {i.apellido}
                </option>
              ))}
            </select>
          </label>
          <button className="boton">Ver día</button>
        </form>
      </nav>
      <div className="actividad-lista">
        {filas.slice(0, 50).map((f) => (
          <article key={f.id} className="equipo-operacion actividad-item">
            <strong>
              <Clock3 size={15} aria-hidden="true" />{" "}
              {nombres[f.accion] || "Actualizó un registro"}
            </strong>
            <p>
              Registrado por: {f.actorNombre || "Autor desconocido"} ·{" "}
              {f.creadaEn.toLocaleString("es-AR", {
                timeZone: c.negocio.zonaHoraria,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {"profesionalId" in f && typeof f.profesionalId === "string" && (
              <p>
                Corresponde a:{" "}
                {profesionales.find((p) => p.id === f.profesionalId)?.nombre ??
                  "Integrante del equipo"}{" "}
                {profesionales.find((p) => p.id === f.profesionalId)
                  ?.apellido ?? ""}
              </p>
            )}
            {f.sedeId && <p>{sedes.find((s) => s.id === f.sedeId)?.nombre}</p>}
            {"detalle" in f && Boolean(f.detalle) && (
              <p>
                {Object.entries(f.detalle as Record<string, unknown>)
                  .filter(
                    ([k, v]) =>
                      [
                        "concepto",
                        "motivo",
                        "turno",
                        "total",
                        "monto",
                        "medio",
                        "cantidad",
                      ].includes(k) && ["string", "number"].includes(typeof v),
                  )
                  .map(([k, v]) =>
                    k === "monto" || k === "total"
                      ? new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(Number(v))
                      : k === "medio"
                        ? String(v).replaceAll("_", " ").toLowerCase()
                        : String(v),
                  )
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
                    <input
                      type="hidden"
                      name="id"
                      value={String(f.recursoId)}
                    />
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
      </div>
      {filas.length > 50 && (
        <Link
          className="boton"
          href={`${enlaceDia(dia)}&antes=${encodeURIComponent(filas[49]!.creadaEn.toISOString())}&cursor=${encodeURIComponent(filas[49]!.id)}`}
        >
          Ver más actividad de este día
        </Link>
      )}
      {!filas.length && <p>No hay actividad para estos filtros.</p>}
    </div>
  );
}
