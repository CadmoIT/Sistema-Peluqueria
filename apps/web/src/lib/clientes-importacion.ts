/** Decide qué filas crear, completar u omitir sin sobrescribir fichas existentes. */
import {
  completarVacios,
  validarFilas,
  type DatosCliente,
  type ErrorFila,
} from "./clientes-archivo";
export type ClienteImportable = DatosCliente & {
  id: string;
  archivadoEn?: Date | null;
};
export type OperacionCliente = {
  fila: number;
  tipo: "CREAR" | "COMPLETAR" | "OMITIR";
  datos: DatosCliente;
  id?: string;
  mensaje: string;
};
export function planificarImportacion(
  entrada: unknown[],
  existentes: ClienteImportable[],
  completar: boolean,
) {
  const validacion = validarFilas(entrada);
  const errores: ErrorFila[] = [...validacion.errores];
  const operaciones: OperacionCliente[] = [];
  for (const fila of validacion.filas) {
    const correos = fila.email
      ? existentes.filter((c) => c.email?.trim().toLowerCase() === fila.email)
      : [];
    const telefonos = fila.telefono
      ? existentes.filter(
          (c) => c.telefono?.replace(/[^+\d]/g, "") === fila.telefono,
        )
      : [];
    if (
      correos.length > 1 ||
      telefonos.length > 1 ||
      (correos[0] && telefonos[0] && correos[0].id !== telefonos[0].id)
    ) {
      errores.push({
        fila: fila.fila,
        mensaje:
          "El email o teléfono corresponde a fichas distintas. Revisá estos datos.",
      });
      continue;
    }
    const existente = correos[0] ?? telefonos[0];
    if (!existente)
      operaciones.push({
        fila: fila.fila,
        tipo: "CREAR",
        datos: fila,
        mensaje: "Cliente nuevo",
      });
    else {
      const datos = completarVacios(existente, fila);
      const cambios = Object.keys(datos).some(
        (campo) =>
          datos[campo as keyof DatosCliente] !==
          existente[campo as keyof DatosCliente],
      );
      operaciones.push({
        fila: fila.fila,
        tipo: completar && cambios ? "COMPLETAR" : "OMITIR",
        datos,
        id: existente.id,
        mensaje:
          completar && cambios
            ? "Completar sólo datos vacíos"
            : "Ya existe; se conserva su ficha",
      });
    }
  }
  return {
    operaciones,
    errores,
    creados: operaciones.filter((o) => o.tipo === "CREAR").length,
    actualizados: operaciones.filter((o) => o.tipo === "COMPLETAR").length,
    omitidos: operaciones.filter((o) => o.tipo === "OMITIR").length,
  };
}
