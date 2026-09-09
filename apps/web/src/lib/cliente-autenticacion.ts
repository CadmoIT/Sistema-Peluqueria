/** Expone el cliente tipado que consumen los formularios de autenticación. */
import { createAuthClient } from "better-auth/react";

export const clienteAutenticacion = createAuthClient({
  basePath: "/api/autenticacion",
});
