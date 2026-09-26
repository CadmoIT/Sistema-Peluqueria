/** Presenta dinero registrado en caja con filtros automáticos y agrupación por hora o fecha. */
import { obtenerReportes } from "@/servicios/panel-datos.service";
import { VistaPanelLista } from "@/componentes/panel/navegacion-carga-panel";
import { agruparMovimientos } from "@/lib/reportes-movimientos";
import { FiltrosReportes } from "@/componentes/panel/filtros-reportes";
import { MetricasOperativas } from "@/componentes/panel/metricas-operativas";
import { GraficoMovimientos } from "@/componentes/panel/grafico-movimientos";
import "./reportes.css";
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
        <h1>Reportes</h1>
        <FiltrosReportes
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
      <MetricasOperativas
        datos={[
          { etiqueta: "Ingresos", valor: ingresos },
          { etiqueta: "Egresos", valor: egresos },
          { etiqueta: "Saldo", valor: ingresos - egresos },
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
