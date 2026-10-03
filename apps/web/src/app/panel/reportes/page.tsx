/** Presenta dinero registrado en caja con filtros automáticos y agrupación por hora o fecha. */
import { obtenerReportes } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { agruparMovimientos } from "@/lib/reportes-movimientos";
import { FiltrosReportes } from "@/componentes/panel/filtros-reportes";
import { MetricasOperativas } from "@/componentes/panel/metricas-operativas";
import { GraficoMovimientos } from "@/componentes/panel/grafico-movimientos";
import "./reportes.css";
import { requerirContextoPanel } from "@/servicios/panel-datos.service";
export const metadata = { title: "Reportes" };
export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    local?: string;
    profesional?: string;
  }>;
}) {
  const p = await searchParams,
    datos = await obtenerReportes(p.periodo, p.local, p.profesional);
  const empleado =
    (await requerirContextoPanel()).membresia.rol === "PROFESIONAL";
  const ingresos = datos.movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = datos.movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  return (
    <div className="panel-contenido reportes-contenido">
      <VistaPanelLista ruta="/panel/reportes" />
      <header className="cabecera-seccion reportes-cabecera">
        <h1>{empleado ? "Mis reportes" : "Reportes"}</h1>
        <FiltrosReportes
          personal={empleado}
          periodo={datos.periodo}
          local={datos.localSeleccionado ?? ""}
          atribucion={datos.atribucion}
          sedes={datos.sedes}
          profesionales={datos.profesionales.map((p) => ({
            id: p.id,
            nombre: [p.nombre, p.apellido].filter(Boolean).join(" "),
          }))}
        />
      </header>
      {empleado && (
        <p>
          Mis ingresos son cobros atribuidos, no sueldo ni comisión. Las compras
          del negocio no se descuentan de tus ingresos.
        </p>
      )}
      <MetricasOperativas
        datos={[
          { etiqueta: "Ingresos", valor: ingresos },
          { etiqueta: "Egresos", valor: egresos },
          { etiqueta: "Saldo", valor: ingresos - egresos },
          { etiqueta: "Pendiente de cobro", valor: datos.saldoPendiente },
        ]}
      />
      <section className="reportes-grafico">
        <h2>
          Movimientos ·{" "}
          {datos.periodo === "dia"
            ? "Hoy"
            : datos.periodo === "semana"
              ? "Semana"
              : "Mes"}
        </h2>
        {datos.movimientos.length ? (
          <>
            <div className="reportes-leyenda">
              <span className="reporte-leyenda-ingreso">Ingresos</span>
              <span className="reporte-leyenda-egreso">Egresos</span>
            </div>
            <GraficoMovimientos
              intervalos={agruparMovimientos(
                datos.movimientos,
                datos.periodo,
                datos.negocio.zonaHoraria,
              )}
            />
          </>
        ) : (
          <p className="sin-resultados">
            No hay movimientos para estos filtros. Los ingresos registrados en
            Caja aparecerán acá.
          </p>
        )}
      </section>
    </div>
  );
}
