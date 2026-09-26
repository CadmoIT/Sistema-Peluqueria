/** Registra movimientos operativos y resume el movimiento del día. */
import { Plus } from "lucide-react";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { registrarMovimientoCaja } from "./acciones";
import { PuntoVenta } from "@/componentes/panel/punto-venta";
import { FormularioAccion } from "@/componentes/panel/formulario-accion";
import { MetricasOperativas } from "@/componentes/panel/metricas-operativas";
import { obtenerCaja } from "@/servicios/panel-datos.service";
import { FiltroLocalUrl } from "@/componentes/panel/filtro-local";

export const metadata = { title: "Caja" };
export default async function PaginaCaja({
  searchParams,
}: {
  searchParams: Promise<{ local?: string }>;
}) {
  const parametros = await searchParams;
  const datos = await obtenerCaja(parametros.local);
  const ingresos = datos.movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = datos.movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/caja" />
      <header className="cabecera-seccion">
        <div>
          <h1>Caja</h1>
        </div>
        <div className="acciones-seccion">
          {datos.sedes.length > 1 && (
            <FiltroLocalUrl
              className="filtro-discreto"
              sedes={datos.sedes}
              valor={datos.localSeleccionado}
              ariaLabel="Filtrar caja por local"
            />
          )}
          <details className="desplegable-accion">
            <summary className="boton boton--primario">
              <Plus /> Agregar
            </summary>
            <FormularioAccion
              accion={registrarMovimientoCaja}
              texto="Registrar"
            >
              <h2>Movimiento de caja</h2>
              <label>
                Tipo
                <select value="INGRESO" disabled aria-label="Tipo de movimiento">
                  <option value="INGRESO">Ingreso</option>
                </select>
              </label>
              <input type="hidden" name="tipo" value="INGRESO" />
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
              {datos.profesionales.length ? (
                <label>
                  Atribuir movimiento a
                  <select name="atribucion" required defaultValue="">
                    <option value="" disabled>
                      Elegí Local o una persona
                    </option>
                    <option value="local">Local</option>
                    {datos.profesionales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.apellido}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input name="atribucion" type="hidden" value="local" />
              )}
            </FormularioAccion>
          </details>
        </div>
      </header>
      <MetricasOperativas
        className="metricas-operativas metricas-operativas--dos"
        datos={[
          { etiqueta: "Ingresos de hoy", valor: ingresos },
          { etiqueta: "Saldo del día", valor: ingresos - egresos },
        ]}
      />
      <PuntoVenta
        profesionales={datos.profesionales.map((p) => ({
          id: p.id,
          nombre: [p.nombre, p.apellido].filter(Boolean).join(" "),
        }))}
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
    </div>
  );
}
