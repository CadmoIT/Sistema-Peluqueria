/** Publica los endpoints HTTP de Better Auth dentro de la aplicación web. */
import { toNextJsHandler } from "better-auth/next-js";
import { autenticacion } from "@/lib/autenticacion";

export const { GET, POST } = toNextJsHandler(autenticacion);
