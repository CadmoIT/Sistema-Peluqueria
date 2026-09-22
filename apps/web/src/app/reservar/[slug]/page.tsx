/** Conserva enlaces antiguos y los lleva al flujo integrado del micrositio. */
import { redirect } from "next/navigation";

export const metadata = { title: "Reservar turno" };
export default async function PaginaReserva({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/sitio/${slug}`);
}
