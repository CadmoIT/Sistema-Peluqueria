/** Compatibilidad para enlaces antiguos: la cuenta no tiene una pantalla separada. */
import { redirect } from "next/navigation";
export default function MiCuenta() {
  redirect("/panel/resumen");
}
