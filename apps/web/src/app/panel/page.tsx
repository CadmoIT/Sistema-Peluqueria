/** Conserva la dirección antigua del panel y abre su resumen. */
import { redirect } from "next/navigation";

export default function PaginaPanel() {
  redirect("/panel/resumen");
}
