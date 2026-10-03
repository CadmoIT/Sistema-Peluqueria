/** Reintenta únicamente transacciones abortadas por PostgreSQL, nunca envíos externos. */
import { Prisma, type PrismaClient } from "@prisma/client";
export async function transaccionEquipo<T>(
  db: PrismaClient,
  ejecutar: (tx: Prisma.TransactionClient) => Promise<T>,
  opciones?: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    maxWait?: number;
    timeout?: number;
  },
): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await db.$transaction(ejecutar, {
        maxWait: 10000,
        timeout: 20000,
        ...opciones,
      });
    } catch (e) {
      const abortada =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2034" ||
          (e.code === "P2010" &&
            ["40P01", "40001"].includes(String(e.meta?.code))));
      if (!abortada || intento >= 3) throw e;
    }
  }
}
