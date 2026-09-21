/** Reutiliza métricas de texto y valor sin iconos ni información secundaria. */
export function MetricasOperativas({ datos, className = "metricas-operativas" }: { datos: Array<{ etiqueta: string; valor: number }>; className?: string }) {
  return <section className={className}>{datos.map((d) => <article className="metrica-operativa" key={d.etiqueta}><span>{d.etiqueta}</span><strong>{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(d.valor)}</strong></article>)}</section>;
}
