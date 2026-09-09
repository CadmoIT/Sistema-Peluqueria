/** Resuelve y muestra el micrositio publico solicitado por slug. */
import { notFound } from "next/navigation";
import { negocioDemo } from "../../../datos/demo";
import { SitioNegocio } from "../../../componentes/sitio/sitio-negocio";
export function generateMetadata() {
  return { title: negocioDemo.nombre, description: negocioDemo.descripcion };
}
export default async function PaginaSitio({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (![negocioDemo.slug, "manlybarbercompany"].includes(slug)) notFound();
  return <SitioNegocio negocio={negocioDemo} />;
}
