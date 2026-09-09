/** Define el registro idempotente de eventos recibidos desde proveedores externos. */
export const EVENTOS_REPOSITORY = Symbol("EVENTOS_REPOSITORY");

export interface EventosRepository {
  yaFueRecibido(clave: string): Promise<boolean>;
  guardar(clave: string): Promise<void>;
}
