/** Registra ingresos y egresos operativos y resume el movimiento del día. */
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { registrarMovimientoCaja } from "./acciones";
import { PuntoVenta } from "@/componentes/panel/punto-venta";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { MetricasOperativas } from "@/componentes/panel/metricas-operativas";
import { obtenerCaja } from "@/servicios/panel-datos.service";

export const metadata = { title: "Caja" };
export default async function PaginaCaja() {
  const datos = await obtenerCaja();
  const ingresos = datos.movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = datos.movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Caja</h1>
        </div>
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Registrar movimiento
          </summary>
          <FormularioAccion accion={registrarMovimientoCaja} texto="Registrar">
            <h2>Movimiento de caja</h2>
            <label>
              Tipo
              <select name="tipo">
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </label>
            <label>
              Concepto
              <input name="concepto" required />
            </label>
            <label>
              Monto
              <input name="monto" type="number" min="0" required />
            </label>
            {datos.sedes.length === 1 ? (
              <input type="hidden" name="sedeId" value={datos.sedes[0]!.id} />
            ) : (
              <label>
                Local
                <select name="sedeId" required>
                  {datos.sedes.map((sede) => (
                    <option value={sede.id} key={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {datos.profesionales.length ? <label>Atribuir movimiento a<select name="atribucion" required defaultValue=""><option value="" disabled>Elegí Local o una persona</option><option value="local">Local</option>{datos.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}</select></label> : <input name="atribucion" type="hidden" value="local" />}
          </FormularioAccion>
        </details>
      </header>
      <MetricasOperativas datos={[{ etiqueta: "Ingresos de hoy", valor: ingresos }, { etiqueta: "Egresos de hoy", valor: egresos }, { etiqueta: "Saldo del día", valor: ingresos - egresos }]} />
      <PuntoVenta
        profesionales={datos.profesionales.map((p) => ({ id: p.id, nombre: [p.nombre, p.apellido].filter(Boolean).join(" ") }))}
        sedes={datos.sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
        }))}
        articulos={[
          ...datos.servicios.map((servicio) => ({
            id: servicio.id,
            tipo: "servicio" as const,
            nombre: servicio.nombre,
            precio: Number(servicio.precio),
            sedesIds: servicio.sedes.map((s) => s.sedeId),
          })),
          ...datos.productos.map((producto) => ({
            id: producto.id,
            tipo: "producto" as const,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            stockPorSede: Object.fromEntries(
              producto.existencias.map((item) => [item.sedeId, item.cantidad]),
            ),
          })),
        ]}
      />
      <div className="tabla-panel movimientos-caja">
        {datos.movimientos.map((movimiento) => (
          <div className="tabla-panel__fila" key={movimiento.id}>
            <span>
              {movimiento.tipo === "INGRESO" ? (
                <ArrowUpRight />
              ) : (
                <ArrowDownLeft />
              )}
            </span>
            <strong>{movimiento.concepto}</strong>
            <small>
              {new Intl.DateTimeFormat("es-AR", { timeStyle: "short", hour12: false, timeZone: datos.negocio.zonaHoraria }).format(
                movimiento.creadoEn,
              )}
            </small>
            <b>
              {movimiento.tipo === "EGRESO" ? "−" : "+"}
              {pesos(Number(movimiento.monto))}
            </b>
          </div>
        ))}
        {!datos.movimientos.length && (
          <p className="sin-resultados">
            Todavía no registraste movimientos hoy.
          </p>
        )}
      </div>
    </div>
  );
}
function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
