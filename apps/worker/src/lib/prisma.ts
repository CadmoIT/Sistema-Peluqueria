/** Comparte una conexión Prisma entre los trabajos ejecutados por el worker. */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({ log: ["error", "warn"] });
