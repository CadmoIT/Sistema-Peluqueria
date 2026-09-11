/** Confirma una importación revisada, detecta duplicados y registra la auditoría. */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerContextoApi } from "@/servicios/contexto-api.service";
import { LIMITE_FILAS_IMPORTACION } from "@/servicios/importacion-clientes.service";

type FilaCliente = {
  fila?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
};

type SolicitudImportacion = {
  filas?: FilaCliente[];
  completarExistentes?: boolean;
};

type FilaNormalizada = {
  fila: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
};

export async function POST(solicitud: Request) {
  const contexto = await obtenerContextoApi();
  if (!contexto) {
    return NextResponse.json({ mensaje: "Sesión no válida." }, { status: 401 });
  }

  const entrada = (await solicitud
    .json()
    .catch(() => null)) as SolicitudImportacion | null;
  if (!entrada?.filas?.length) {
    return NextResponse.json(
      { mensaje: "No hay filas para importar." },
      { status: 400 },
    );
  }
  if (entrada.filas.length > LIMITE_FILAS_IMPORTACION) {
    return NextResponse.json(
      {
        mensaje: `Se permiten hasta ${LIMITE_FILAS_IMPORTACION} filas por importación.`,
      },
      { status: 400 },
    );
  }

  const resultadoValidacion = validarFilas(entrada.filas);
  const filasValidas = resultadoValidacion.filas;
  const correos = filasValidas.flatMap((fila) =>
    fila.email ? [fila.email] : [],
  );
  const telefonos = filasValidas.flatMap((fila) =>
    fila.telefono ? [fila.telefono] : [],
  );
  const existentes = await prisma.cliente.findMany({
    where: {
      negocioId: contexto.negocio.id,
      OR: [
        ...(correos.length ? [{ email: { in: correos } }] : []),
        ...(telefonos.length ? [{ telefono: { in: telefonos } }] : []),
      ],
    },
  });
  const porEmail = new Map(
    existentes.flatMap((cliente) =>
      cliente.email ? [[cliente.email, cliente]] : [],
    ),
  );
  const porTelefono = new Map(
    existentes.flatMap((cliente) =>
      cliente.telefono ? [[cliente.telefono, cliente]] : [],
    ),
  );

  let creados = 0;
  let actualizados = 0;
  let omitidos = 0;

  await prisma.$transaction(async (tx) => {
    for (const fila of filasValidas) {
      const existente =
        (fila.email ? porEmail.get(fila.email) : undefined) ??
        (fila.telefono ? porTelefono.get(fila.telefono) : undefined);

      if (existente && !entrada.completarExistentes) {
        omitidos += 1;
        continue;
      }

      if (existente) {
        await tx.cliente.update({
          where: { id: existente.id },
          data: {
            nombre: fila.nombre ?? existente.nombre,
            apellido: fila.apellido ?? existente.apellido,
            email: fila.email ?? existente.email,
            telefono: fila.telefono ?? existente.telefono,
          },
        });
        actualizados += 1;
      } else {
        const cliente = await tx.cliente.create({
          data: {
            negocioId: contexto.negocio.id,
            nombre: fila.nombre,
            apellido: fila.apellido,
            email: fila.email,
            telefono: fila.telefono,
          },
        });
        if (fila.email) porEmail.set(fila.email, cliente);
        if (fila.telefono) porTelefono.set(fila.telefono, cliente);
        creados += 1;
      }
    }

    await tx.auditoria.create({
      data: {
        negocioId: contexto.negocio.id,
        usuarioId: contexto.usuario.id,
        accion: "CLIENTES_IMPORTADOS",
        recurso: "Cliente",
        detalle: {
          creados,
          actualizados,
          omitidos,
          errores: resultadoValidacion.errores.length,
        } satisfies Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json({
    creados,
    actualizados,
    omitidos,
    errores: resultadoValidacion.errores,
  });
}

function validarFilas(filas: FilaCliente[]) {
  const validas: FilaNormalizada[] = [];
  const errores: Array<{ fila: number; mensaje: string }> = [];
  const clavesVistas = new Set<string>();

  filas.forEach((fila, indice) => {
    const normalizada: FilaNormalizada = {
      fila: fila.fila ?? indice + 2,
      nombre: limpiar(fila.nombre),
      apellido: limpiar(fila.apellido),
      email: limpiar(fila.email)?.toLowerCase() ?? null,
      telefono: limpiar(fila.telefono)?.replace(/[^+\d]/g, "") ?? null,
    };

    if (
      !Object.values(normalizada).some(
        (valor, posicion) => posicion > 0 && valor,
      )
    ) {
      errores.push({ fila: normalizada.fila, mensaje: "La fila está vacía." });
      return;
    }
    if (
      normalizada.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizada.email)
    ) {
      errores.push({
        fila: normalizada.fila,
        mensaje: "El correo no es válido.",
      });
      return;
    }
    if (
      normalizada.telefono &&
      normalizada.telefono.replace(/\D/g, "").length < 6
    ) {
      errores.push({
        fila: normalizada.fila,
        mensaje: "El teléfono es demasiado corto.",
      });
      return;
    }

    const clave = normalizada.email
      ? `email:${normalizada.email}`
      : normalizada.telefono
        ? `telefono:${normalizada.telefono}`
        : `fila:${normalizada.fila}`;
    if (clavesVistas.has(clave)) {
      errores.push({
        fila: normalizada.fila,
        mensaje: "Está repetida en el archivo.",
      });
      return;
    }

    clavesVistas.add(clave);
    validas.push(normalizada);
  });

  return { filas: validas, errores };
}

function limpiar(valor?: string) {
  const resultado = valor?.trim();
  return resultado || null;
}
