/** Registra ingresos y egresos operativos y resume el movimiento del día. */
import { ArrowDownLeft, ArrowUpRight, Plus, WalletCards } from "lucide-react";
import { registrarMovimientoCaja } from "./acciones";
import { PuntoVenta } from "@/componentes/panel/punto-venta";
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
          <p>Ingresos y gastos operativos del negocio.</p>
        </div>
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Registrar movimiento
          </summary>
          <form
            action={registrarMovimientoCaja}
            className="formulario-flotante"
          >
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
            <label>
              Sede
              <select name="sedeId" required>
                {datos.sedes.map((sede) => (
                  <option value={sede.id} key={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button className="boton boton--primario">Registrar</button>
          </form>
        </details>
      </header>
      <section className="metricas-panel tres">
        <Metrica
          icono={<ArrowUpRight />}
          texto="Ingresos de hoy"
          valor={ingresos}
        />
        <Metrica
          icono={<ArrowDownLeft />}
          texto="Egresos de hoy"
          valor={egresos}
        />
        <Metrica
          icono={<WalletCards />}
          texto="Saldo del día"
          valor={ingresos - egresos}
        />
      </section>
      <PuntoVenta
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
              {new Intl.DateTimeFormat("es-AR", { timeStyle: "short" }).format(
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
function Metrica({
  icono,
  texto,
  valor,
}: {
  icono: React.ReactNode;
  texto: string;
  valor: number;
}) {
  return (
    <article>
      <span className="metrica-icono">{icono}</span>
      <div>
        <small>{texto}</small>
        <strong>{pesos(valor)}</strong>
      </div>
    </article>
  );
}
function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
