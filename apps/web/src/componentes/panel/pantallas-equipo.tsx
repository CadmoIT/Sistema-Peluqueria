/** Presenta versiones operativas sin exponer controles administrativos a empleados. */
import { VistaPanelLista } from "./navegacion-carga-panel";
import { CompraEquipo } from "./compra-equipo";
import { randomUUID } from "node:crypto";
import { FormularioAccion } from "./formulario-accion";
import { registrarConsumo } from "@/app/panel/actividad/acciones";
import { enlaceSitioPublico } from "@/lib/dominios-publicos";
type Sede = { id: string; nombre: string };
function Local({ sedes }: { sedes: Sede[] }) {
  return (
    <label>
      Local
      <select name="sedeId" required>
        {sedes.map((s) => (
          <option value={s.id} key={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
export function InventarioEmpleado({
  sedes,
  productos,
}: {
  sedes: Sede[];
  productos: Array<{
    id: string;
    nombre: string;
    existencias: Array<{ sedeId: string; cantidad: number }>;
  }>;
}) {
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/inventario" />
      <h1>Inventario</h1>
      <p>
        Stock compartido de tus locales. Registrá lo que usaste; el dueño
        administra productos y ajustes.
      </p>
      <details className="equipo-operacion">
        <summary>Registrar consumo</summary>
        <FormularioAccion
          accion={registrarConsumo}
          texto="Registrar consumo"
          className="formulario-apilado"
        >
          <input type="hidden" name="idempotencia" value={randomUUID()} />
          <Local sedes={sedes} />
          <label>
            Producto
            <select name="productoId" required>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input type="number" name="cantidad" min="1" step="1" required />
          </label>
          <label>
            Motivo
            <input name="motivo" maxLength={200} required />
          </label>
        </FormularioAccion>
      </details>
      {productos.map((p) => (
        <article key={p.id} className="equipo-operacion">
          <h2>{p.nombre}</h2>
          {p.existencias.map((e) => (
            <p key={e.sedeId}>
              {sedes.find((s) => s.id === e.sedeId)?.nombre}: {e.cantidad}{" "}
              unidades
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}
export function ComprasEmpleado({
  sedes,
  productos,
  compras,
}: {
  sedes: Sede[];
  productos: Array<{ id: string; nombre: string }>;
  compras: Array<{
    id: string;
    proveedor: string | null;
    total: unknown;
    creadoEn: Date;
    sedeId: string;
    anuladoEn: Date | null;
    items: Array<{
      id: string;
      nombre: string;
      cantidad: number;
      costo: unknown;
    }>;
  }>;
}) {
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/compras" />
      <h1>Compras</h1>
      <p>
        Compras compartidas de tus locales. Se incorporan al stock y a los
        egresos del negocio, no a tus ingresos personales.
      </p>
      <details className="equipo-operacion">
        <summary>Registrar compra recibida</summary>
        <CompraEquipo
          sedes={sedes}
          productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        />
      </details>
      {compras.map((p) => (
        <article className="equipo-operacion" key={p.id}>
          <strong>{p.proveedor || "Compra"}</strong>
          <p>
            {sedes.find((s) => s.id === p.sedeId)?.nombre} ·{" "}
            {p.creadoEn.toLocaleDateString("es-AR")} · $ {String(p.total)}{" "}
            {p.anuladoEn ? "· Anulada" : ""}
          </p>
          <ul>
            {p.items.map((i) => (
              <li key={i.id}>
                {i.nombre} · {i.cantidad} unidades · $ {String(i.costo)} por
                unidad
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
export function SitioEmpleado({
  sedes,
  slug,
  profesionalId,
  publicado,
  variasSucursales,
}: {
  sedes: Sede[];
  slug: string;
  profesionalId: string;
  publicado: boolean;
  variasSucursales: boolean;
}) {
  return (
    <div className="panel-contenido">
      <VistaPanelLista ruta="/panel/mi-sitio" />
      <h1>Mi sitio</h1>
      <p>
        Compartí el sitio del negocio con vos preseleccionado. El dueño
        administra el diseño y su publicación.
      </p>
      {publicado ? (
        sedes.map((s) => (
          <article key={s.id} className="equipo-operacion">
            <h2>{s.nombre}</h2>
            <a
              href={`${enlaceSitioPublico(slug, variasSucursales ? s.id : undefined)}?profesional=${encodeURIComponent(profesionalId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir mi enlace de reservas →
            </a>
          </article>
        ))
      ) : (
        <p>El sitio no está disponible para reservas. Consultá al dueño.</p>
      )}
    </div>
  );
}
