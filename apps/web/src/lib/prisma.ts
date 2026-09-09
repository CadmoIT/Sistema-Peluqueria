/** Mantiene una única conexión Prisma reutilizable durante el desarrollo de Next.js. */
import { PrismaClient } from "@prisma/client";

const entornoGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  entornoGlobal.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") entornoGlobal.prisma = prisma;
