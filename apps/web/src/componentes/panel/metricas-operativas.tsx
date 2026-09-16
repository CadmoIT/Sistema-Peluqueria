/** Reutiliza métricas de texto y valor sin iconos ni información secundaria. */
export function MetricasOperativas({ datos }: { datos: Array<{ etiqueta: string; valor: number }> }) {
  return <section className="metricas-operativas">{datos.map((d) => <article className="metrica-operativa" key={d.etiqueta}><span>{d.etiqueta}</span><strong>{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(d.valor)}</strong></article>)}</section>;
}
