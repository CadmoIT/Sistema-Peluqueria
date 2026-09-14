/** Regenera únicamente la cuenta demostrativa con datos relativos a la fecha actual. */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const EMAIL_DEMO = "demo@turnosrapidos.com.ar";
const CLAVE_DEMO = "DemoTurnos2026!";
const SLUG_DEMO = "estudio-aurora-demo";

if (process.env.NODE_ENV === "production") {
  throw new Error("La cuenta demo no se puede crear en producción.");
}
if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL. Ejecutá primero pnpm dev:infraestructura.",
  );
}
const servidorBase = new URL(process.env.DATABASE_URL).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(servidorBase)) {
  throw new Error("La demo sólo puede cargarse en una base de datos local.");
}

const prisma = new PrismaClient();

async function crearDemo() {
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: EMAIL_DEMO },
    include: {
      membresias: { include: { negocio: { select: { slug: true } } } },
    },
  });
  if (
    usuarioExistente &&
    (usuarioExistente.nombre !== "Sofía Demo" ||
      usuarioExistente.membresias.some(
        (membresia) => membresia.negocio.slug !== SLUG_DEMO,
      ))
  ) {
    throw new Error(
      "El email demo ya pertenece a otra cuenta; no se modificó.",
    );
  }
  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL_DEMO },
    update: {
      nombre: "Sofía Demo",
      emailVerificado: true,
    },
    create: {
      nombre: "Sofía Demo",
      email: EMAIL_DEMO,
      emailVerificado: true,
    },
  });
  const cuentaExistente = await prisma.cuentaOAuth.findUnique({
    where: {
      proveedor_cuentaProveedorId: {
        proveedor: "credential",
        cuentaProveedorId: usuario.id,
      },
    },
  });
  const contrasena = await hashPassword(CLAVE_DEMO);
  if (cuentaExistente) {
    await prisma.cuentaOAuth.update({
      where: { id: cuentaExistente.id },
      data: { contrasena },
    });
  } else {
    await prisma.cuentaOAuth.create({
      data: {
        usuarioId: usuario.id,
        proveedor: "credential",
        cuentaProveedorId: usuario.id,
        contrasena,
      },
    });
  }

  const existente = await prisma.negocio.findUnique({
    where: { slug: SLUG_DEMO },
    include: { membresias: true },
  });
  if (
    existente &&
    !existente.membresias.some(
      (membresia) => membresia.usuarioId === usuario.id,
    )
  ) {
    throw new Error(
      "El slug de la demo pertenece a otra cuenta; no se modificó.",
    );
  }
  if (existente) {
    await prisma.$transaction([
      prisma.pago.deleteMany({ where: { negocioId: existente.id } }),
      prisma.reservaServicio.deleteMany({
        where: { reserva: { negocioId: existente.id } },
      }),
      prisma.ventaItem.deleteMany({
        where: { venta: { negocioId: existente.id } },
      }),
      prisma.negocio.delete({ where: { id: existente.id } }),
    ]);
  }

  await prisma.$transaction(async (tx) => poblarNegocio(tx, usuario.id), {
    timeout: 30_000,
  });

  console.log("Cuenta demo lista:");
  console.log("  Email: " + EMAIL_DEMO);
  console.log("  Contraseña: " + CLAVE_DEMO);
}

async function poblarNegocio(tx: Prisma.TransactionClient, usuarioId: string) {
  const ahora = new Date();
  const proximoCobro = sumarDias(ahora, 30);
  const negocio = await tx.negocio.create({
    data: {
      slug: SLUG_DEMO,
      nombre: "Estudio Aurora",
      descripcion:
        "Belleza y bienestar con profesionales que cuidan cada detalle.",
      email: "hola@estudioaurora.com.ar",
      telefono: "+54 11 5555 2026",
      politicaContacto: "CUALQUIERA",
      publicado: true,
      membresias: {
        create: { usuarioId, rol: "DUENO", activo: true },
      },
      suscripcion: {
        create: {
          plan: "autogestionado",
          estado: "ACTIVA",
          precioMensual: 9900,
          proximoCobro,
          pruebaIniciaEn: sumarDias(ahora, -30),
          pruebaFinalizaEn: sumarDias(ahora, -23),
        },
      },
    },
  });

  const locales = [];
  for (const datos of [
    {
      nombre: "Palermo",
      direccion: "Honduras 4850, Palermo, Buenos Aires",
      telefono: "+54 11 5555 2026",
      puntaje: 4.8,
      resenas: 187,
    },
    {
      nombre: "Belgrano",
      direccion: "Mendoza 2310, Belgrano, Buenos Aires",
      telefono: "+54 11 5555 2027",
      puntaje: 4.7,
      resenas: 94,
    },
  ]) {
    const local = await tx.sede.create({
      data: {
        negocioId: negocio.id,
        nombre: datos.nombre,
        direccion: datos.direccion,
        telefono: datos.telefono,
        googlePuntaje: datos.puntaje,
        googleResenas: datos.resenas,
        googleMapsUrl:
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(datos.direccion),
      },
    });
    locales.push(local);
    await tx.horarioSede.createMany({
      data: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
        negocioId: negocio.id,
        sedeId: local.id,
        diaSemana,
        abre: diaSemana === 6 ? "09:00" : "08:30",
        cierra: diaSemana === 6 ? "18:00" : "20:30",
        activo: true,
      })),
    });
  }

  const categorias = new Map<string, string>();
  for (const [orden, nombre] of [
    "Cabello",
    "Color",
    "Uñas",
    "Bienestar",
  ].entries()) {
    const categoria = await tx.categoriaServicio.create({
      data: { negocioId: negocio.id, nombre, orden },
    });
    categorias.set(nombre, categoria.id);
  }
  const definicionesServicios = [
    ["Corte y peinado", "Cabello", 14500, 60],
    ["Brushing", "Cabello", 10500, 45],
    ["Hidratación profunda", "Cabello", 18000, 60],
    ["Color completo", "Color", 34000, 120],
    ["Balayage", "Color", 52000, 180],
    ["Retoque de raíces", "Color", 24000, 90],
    ["Manicura semipermanente", "Uñas", 15000, 60],
    ["Kapping", "Uñas", 19000, 75],
    ["Belleza de pies", "Uñas", 17500, 60],
    ["Masaje relajante", "Bienestar", 26000, 60],
    ["Limpieza facial", "Bienestar", 23000, 60],
    ["Spa de manos", "Bienestar", 12000, 40],
  ] as const;
  const servicios = [];
  for (const [
    nombre,
    categoria,
    precio,
    duracionMinutos,
  ] of definicionesServicios) {
    const servicio = await tx.servicio.create({
      data: {
        negocioId: negocio.id,
        categoriaId: categorias.get(categoria),
        nombre,
        descripcion: "Atención personalizada con productos profesionales.",
        precio,
        duracionMinutos,
        bufferMinutos: 10,
        porcentajeSena: 20,
        activo: true,
      },
    });
    servicios.push(servicio);
    await tx.servicioSede.createMany({
      data: locales.map((local) => ({
        servicioId: servicio.id,
        sedeId: local.id,
      })),
    });
  }

  const profesionales = [];
  const nombresProfesionales = [
    ["Valentina", "Ríos", "Colorista"],
    ["Martín", "Acosta", "Estilista"],
    ["Camila", "Suárez", "Manicurista"],
    ["Julieta", "Paz", "Cosmetóloga"],
    ["Nicolás", "Ferrari", "Masajista"],
  ] as const;
  for (const [
    indice,
    [nombre, apellido, especialidad],
  ] of nombresProfesionales.entries()) {
    const profesional = await tx.profesional.create({
      data: {
        negocioId: negocio.id,
        nombre,
        apellido,
        especialidad,
        biografia:
          "Profesional de Estudio Aurora con atención cálida y personalizada.",
      },
    });
    profesionales.push(profesional);
    const localesAsignados =
      indice < 3 ? locales : [locales[indice % locales.length]!];
    await tx.profesionalSede.createMany({
      data: localesAsignados.map((local) => ({
        profesionalId: profesional.id,
        sedeId: local.id,
      })),
    });
    await tx.profesionalServicio.createMany({
      data: servicios
        .filter(
          (_, servicioIndice) =>
            servicioIndice % profesionales.length ===
              indice % profesionales.length ||
            servicioIndice % 3 === indice % 3,
        )
        .map((servicio) => ({
          profesionalId: profesional.id,
          servicioId: servicio.id,
        })),
      skipDuplicates: true,
    });
    await tx.horarioProfesional.createMany({
      data: localesAsignados.flatMap((local) =>
        [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
          negocioId: negocio.id,
          profesionalId: profesional.id,
          sedeId: local.id,
          diaSemana,
          comienza: diaSemana === 6 ? "09:00" : "09:00",
          termina: diaSemana === 6 ? "18:00" : "19:30",
        })),
      ),
    });
  }

  const clientes = [];
  const nombres = [
    "Ana",
    "Lucía",
    "Mariana",
    "Sofía",
    "Carla",
    "Paula",
    "Martina",
    "Florencia",
    "Valeria",
    "Rocío",
    "Agustina",
    "Micaela",
    "Julia",
    "Elena",
    "Natalia",
    "Federico",
    "Tomás",
    "Lucas",
    "Juan",
    "Mateo",
  ];
  const apellidos = [
    "Gómez",
    "Pérez",
    "López",
    "Fernández",
    "Sosa",
    "Romero",
    "Díaz",
    "Álvarez",
  ];
  for (let indice = 0; indice < 40; indice += 1) {
    clientes.push(
      await tx.cliente.create({
        data: {
          negocioId: negocio.id,
          nombre: nombres[indice % nombres.length]!,
          apellido: apellidos[indice % apellidos.length]!,
          email:
            indice % 4 === 0 ? null : "cliente" + (indice + 1) + "@ejemplo.com",
          telefono:
            indice % 5 === 0 ? null : "+54 11 5555 " + String(3000 + indice),
          aceptaWhatsapp: indice % 3 !== 0,
          puntos: indice * 15,
        },
      }),
    );
  }

  for (let indice = 0; indice < 60; indice += 1) {
    const fecha = diaLaboral(sumarDias(ahora, Math.floor((indice - 18) / 3)));
    fecha.setHours([10, 13, 16][indice % 3]!, 0, 0, 0);
    const servicio = servicios[indice % servicios.length]!;
    const fin = new Date(fecha.getTime() + servicio.duracionMinutos * 60_000);
    const estado =
      fecha < ahora
        ? indice % 9 === 0
          ? "AUSENTE"
          : "COMPLETADA"
        : indice % 7 === 0
          ? "PENDIENTE_PAGO"
          : "CONFIRMADA";
    await tx.reserva.create({
      data: {
        negocioId: negocio.id,
        sedeId: locales[indice % locales.length]!.id,
        profesionalId: profesionales[indice % profesionales.length]!.id,
        clienteId: clientes[indice % clientes.length]!.id,
        codigo: randomUUID().slice(0, 8).toUpperCase(),
        estado,
        inicio: fecha,
        fin,
        total: servicio.precio,
        sena: Number(servicio.precio) * 0.2,
        servicios: {
          create: {
            servicioId: servicio.id,
            orden: 1,
            precio: servicio.precio,
            duracionMinutos: servicio.duracionMinutos,
          },
        },
      },
    });
  }

  const productos = [];
  for (const [indice, nombre] of [
    "Shampoo nutritivo",
    "Acondicionador reparador",
    "Máscara capilar",
    "Aceite de puntas",
    "Protector térmico",
    "Crema para peinar",
    "Esmalte fortalecedor",
    "Serum facial",
    "Agua micelar",
    "Crema de manos",
  ].entries()) {
    const producto = await tx.producto.create({
      data: {
        negocioId: negocio.id,
        nombre,
        sku: "AUR-" + String(indice + 1).padStart(3, "0"),
        precio: 8500 + indice * 900,
        costo: 4300 + indice * 450,
        ventaPublica: indice < 6,
      },
    });
    productos.push(producto);
    for (const [localIndice, local] of locales.entries()) {
      const cantidad = (indice * 3 + localIndice * 5) % 22;
      await tx.existencia.create({
        data: {
          negocioId: negocio.id,
          sedeId: local.id,
          productoId: producto.id,
          cantidad,
          minimo: 5,
        },
      });
      await tx.movimientoStock.create({
        data: {
          negocioId: negocio.id,
          sedeId: local.id,
          productoId: producto.id,
          tipo: "INGRESO",
          cantidad: cantidad + 8,
          referencia: "Carga inicial demo",
          creadoEn: sumarDias(ahora, -25),
        },
      });
    }
  }

  for (let indice = 0; indice < 12; indice += 1) {
    const producto = productos[indice % productos.length]!;
    const local = locales[indice % locales.length]!;
    const venta = await tx.venta.create({
      data: {
        negocioId: negocio.id,
        sedeId: local.id,
        clienteId: clientes[indice % clientes.length]!.id,
        total: producto.precio,
        creadoEn: sumarDias(ahora, -indice),
        items: {
          create: {
            productoId: producto.id,
            concepto: producto.nombre,
            cantidad: 1,
            precio: producto.precio,
          },
        },
      },
    });
    await tx.movimientoCaja.create({
      data: {
        negocioId: negocio.id,
        sedeId: local.id,
        tipo: "INGRESO",
        concepto: "Venta " + venta.id.slice(-6),
        monto: producto.precio,
        creadoEn: sumarDias(ahora, -indice),
      },
    });
  }
  for (let indice = 0; indice < 4; indice += 1) {
    await tx.pago.create({
      data: {
        negocioId: negocio.id,
        proveedor: "demo",
        proveedorId: "demo-pago-" + indice,
        idempotencia: "demo-idempotencia-" + indice,
        estado: indice === 3 ? "RECHAZADO" : "APROBADO",
        monto: 9900,
        creadoEn: sumarDias(ahora, -(indice + 1) * 30),
      },
    });
  }

  const configuracion = {
    titulo: "Estudio Aurora",
    descripcion: "Tu momento de belleza y bienestar, reservado en pocos pasos.",
    colorPrincipal: "#126783",
    colorFondo: "#ffffff",
    colorTexto: "#111111",
    logoUrl: "",
    whatsapp: "541155552026",
    instagram: "estudioaurora",
    hero: [
      {
        url: "/demo/estudio-aurora-portada.webp",
        alt: "Manicurista atendiendo a una clienta en un salón luminoso",
        focoX: 50,
        focoY: 50,
      },
    ],
    carruselAutomatico: true,
    secciones: ["servicios", "equipo", "ubicacion"],
    serviciosDestacados: servicios.slice(0, 4).map((servicio) => servicio.id),
  };
  await tx.configuracionSitio.create({
    data: {
      negocioId: negocio.id,
      borrador: configuracion,
      publicada: configuracion,
      version: 1,
      publicadaEn: ahora,
    },
  });
}

function sumarDias(base: Date, cantidad: number) {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + cantidad);
  return fecha;
}

function diaLaboral(fecha: Date) {
  const copia = new Date(fecha);
  if (copia.getDay() === 0) copia.setDate(copia.getDate() + 1);
  return copia;
}

crearDemo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
