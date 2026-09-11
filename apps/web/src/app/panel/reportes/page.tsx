/** Resume ingresos, egresos y resultado diario, semanal o mensual con datos de caja. */
import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { obtenerReportes } from "@/servicios/panel-datos.service";

export const metadata = { title: "Reportes" };
type Periodo = "dia" | "semana" | "mes";

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const entrada = (await searchParams).periodo;
  const periodo: Periodo = ["dia", "semana", "mes"].includes(entrada ?? "")
    ? (entrada as Periodo)
    : "mes";
  const desde = inicioPeriodo(periodo);
  const { movimientos } = await obtenerReportes(desde);
  const ingresos = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);
  const maximo = Math.max(1, ...movimientos.map((m) => Number(m.monto)));
  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Reportes</h1>
          <p>Lectura sencilla de ingresos, gastos y resultado.</p>
        </div>
        <nav className="selector-periodo" aria-label="Período del reporte">
          {(["dia", "semana", "mes"] as const).map((opcion) => (
            <Link
              key={opcion}
              href={`/panel/reportes?periodo=${opcion}`}
              className={periodo === opcion ? "activo" : ""}
            >
              {opcion === "dia"
                ? "Hoy"
                : opcion === "semana"
                  ? "Semana"
                  : "Mes"}
            </Link>
          ))}
        </nav>
      </header>
      <section className="metricas-panel tres">
        <Metrica
          icono={<TrendingUp />}
          texto={`Ingresos · ${etiquetaPeriodo(periodo)}`}
          valor={ingresos}
        />
        <Metrica
          icono={<TrendingDown />}
          texto={`Gastos · ${etiquetaPeriodo(periodo)}`}
          valor={egresos}
        />
        <Metrica
          icono={<BarChart3 />}
          texto="Resultado"
          valor={ingresos - egresos}
        />
      </section>
      <section className="modulo grafico-reporte">
        <h2>Movimientos · {etiquetaPeriodo(periodo)}</h2>
        {movimientos.length ? (
          <div className="barras-reporte">
            {movimientos.map((m) => (
              <span
                key={m.id}
                title={`${m.concepto}: ${pesos(Number(m.monto))}`}
                style={{
                  height: `${Math.max(8, (Number(m.monto) / maximo) * 100)}%`,
                }}
                className={m.tipo === "EGRESO" ? "egreso" : "ingreso"}
              />
            ))}
          </div>
        ) : (
          <div className="estado-vacio">
            <BarChart3 />
            <strong>No hay datos para mostrar</strong>
            <p>Los movimientos de Caja aparecerán acá.</p>
          </div>
        )}
      </section>
    </div>
  );
}
function inicioPeriodo(periodo: Periodo) {
  const fecha = new Date();
  if (periodo === "dia") fecha.setHours(0, 0, 0, 0);
  if (periodo === "semana") {
    const diasDesdeLunes = (fecha.getDay() + 6) % 7;
    fecha.setDate(fecha.getDate() - diasDesdeLunes);
    fecha.setHours(0, 0, 0, 0);
  }
  if (periodo === "mes") {
    fecha.setDate(1);
    fecha.setHours(0, 0, 0, 0);
  }
  return fecha;
}
function etiquetaPeriodo(periodo: Periodo) {
  return periodo === "dia"
    ? "hoy"
    : periodo === "semana"
      ? "esta semana"
      : "este mes";
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
