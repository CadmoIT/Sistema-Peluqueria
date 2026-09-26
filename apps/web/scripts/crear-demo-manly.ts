/** Crea una cuenta local de muestra para Manly sin modificar datos existentes. */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const EMAIL = "manly-demo@turnosrapidos.com.ar";
const CLAVE = "ManlyDemo2026!";
const SLUG = "manly-barber-studio-demo";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("La cuenta Manly de demostración no se crea en producción.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Ejecutá primero pnpm dev:infraestructura.");
}
const dbUrl = new URL(process.env.DATABASE_URL);
if (
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(dbUrl.hostname) ||
  !["5432", "5433"].includes(dbUrl.port)
) {
  throw new Error("La demo sólo puede cargarse en una base de datos local.");
}

const prisma = new PrismaClient();

const sedesDef = [
  {
    nombre: "Manly Las Cañitas",
    direccion: "Migueletes 563, Buenos Aires, Comuna 14, Argentina",
    subdominio: "manly-canitas-demo",
    abre: "10:00",
    cierra: "20:00",
    equipo: [
      ["Lautaro", "", "Barbero y colorista", "/demo/manly/profesional-1.webp"],
      ["Gabriel", "", "Barbero", "/demo/manly/profesional-2.webp"],
      ["Franco", "", "Barbero", "/demo/manly/profesional-3.webp"],
      ["Amado", "", "Barbero", "/demo/manly/profesional-4.webp"],
      ["Leo", "", "Barbero", "/demo/manly/profesional-5.webp"],
      ["Mayra", "", "Profesional de cuidado personal", "/demo/manly/profesional-6.webp"],
    ],
  },
  {
    nombre: "Manly Virrey Avilés",
    direccion: "Virrey Avilés 2831, Buenos Aires, Comuna 13, Argentina",
    subdominio: "manly-virrey-demo",
    abre: "10:00",
    cierra: "20:00",
    equipo: [
      ["Chapu", "", "Barbero", null],
      ["Julián", "", "Barbero", null],
      ["Lucho", "", "Barbero", null],
      ["Williams", "", "Barbero", null],
    ],
  },
  {
    nombre: "Manly Aguilar",
    direccion: "Aguilar 2472, Buenos Aires, Comuna 13, Argentina",
    subdominio: "manly-aguilar-demo",
    abre: "10:00",
    cierra: "20:00",
    equipo: [
      ["Joel", "", "Barbero", null],
      ["Braulio", "", "Barbero", null],
      ["Ivo", "", "Barbero", null],
      ["Leo", "", "Barbero", null],
    ],
  },
] as const;

type ServicioDef = {
  nombre: string;
  categoria: string;
  precio: number;
  minutos: number;
  descripcion: string;
};

const servicio = (
  nombre: string,
  categoria: string,
  precio: number,
  minutos: number,
  descripcion: string,
): ServicioDef => ({ nombre, categoria, precio, minutos, descripcion });

const catalogos: ServicioDef[][] = [
  [
    servicio("Corte Militar", "Cortes", 16000, 20, "Servicio para miembros de las Fuerzas Armadas; requiere presentar acreditación."),
    servicio("Corte Junior (hasta 12 años)", "Cortes", 24000, 30, "Corte para niños menores de 12 años."),
    servicio("Corte Caballeros", "Cortes", 28000, 30, "Corte clásico con máquina y tijera, incluye lavado y acondicionador."),
    servicio("Barba a Medida", "Barba", 24000, 30, "Recorte, forma y estilo con productos, delineado y terminaciones."),
    servicio("Afeitado Tradicional con Toalla Caliente", "Barba", 24000, 30, "Afeitado con navaja, toalla caliente y fría, mascarilla y after shave."),
    servicio("Corte + Barba", "Corte de Cabello & Barba", 33000, 30, "Corte clásico con perfilado ligero de barba."),
    servicio("Corte + Afeitado Tradicional con Toalla Caliente", "Corte de Cabello & Barba", 37000, 60, "Corte clásico y afeitado tradicional con toalla caliente."),
    servicio("Cobertura de Canas", "Color", 44000, 30, "Resultado natural, discreto y sin efecto artificial."),
    servicio("Coloración", "Color", 110000, 120, "Coloración capilar de color a elección."),
    servicio("Corte + Cobertura de Canas", "Corte & Coloración", 66000, 60, "Corte clásico y cobertura de canas."),
    servicio("Corte + Coloración", "Corte & Coloración", 135000, 150, "Corte clásico y coloración capilar."),
    servicio("Masaje Express", "Masajes", 44000, 30, "Protocolo personalizado para aliviar tensiones musculares."),
    servicio("Masaje Descontracturante / Deportivo", "Masajes", 66000, 60, "Tratamiento profundo para tensiones, contracturas y sobrecargas."),
    servicio("Masaje Sedativo / Relajante", "Masajes", 66000, 60, "Técnica de relajación profunda y reducción del estrés."),
    servicio("Manicura Tradicional", "Manos", 33000, 30, "Corte y limado, cuidado de cutículas, exfoliación e hidratación."),
    servicio("Esmaltado Semipermanente", "Manos", 55000, 60, "Manicura completa con esmaltado semipermanente de uno o dos colores."),
    servicio("Kapping Gel", "Manos", 55000, 60, "Refuerzo de uñas con gel y esmaltado semipermanente."),
    servicio("Retirado", "Manos", 33000, 30, "Retiro de esmaltado semipermanente o kapping."),
    servicio("Pedicura Tradicional", "Pies", 44000, 60, "Cuidado tradicional de pies y uñas."),
  ],
  [
    servicio("Corte Junior (hasta 12 años)", "Cortes", 24000, 30, "Corte para niños menores de 12 años."),
    servicio("Corte Caballeros", "Cortes", 28000, 30, "Corte clásico con máquina y tijera."),
    servicio("Barba a Medida", "Barba", 24000, 30, "Recorte, forma y estilo con productos y terminaciones."),
    servicio("Afeitado Tradicional con Toalla Caliente", "Barba", 24000, 30, "Afeitado con navaja, toalla caliente y after shave."),
    servicio("Corte + Barba", "Corte de Cabello & Barba", 37000, 30, "Corte clásico con perfilado ligero de barba."),
    servicio("Corte + Afeitado Tradicional con Toalla Caliente", "Corte de Cabello & Barba", 37000, 60, "Corte clásico y afeitado tradicional con toalla caliente."),
    servicio("Cobertura de Canas", "Color", 44000, 30, "Resultado natural y discreto."),
    servicio("Coloración", "Color", 110000, 120, "Coloración capilar de color a elección."),
    servicio("Corte + Cobertura de Canas", "Corte & Coloración", 66000, 60, "Corte clásico y cobertura de canas."),
    servicio("Corte + Coloración", "Corte & Coloración", 135000, 150, "Corte clásico y coloración capilar."),
  ],
  [
    servicio("Corte Junior (hasta 12 años)", "Cortes", 22000, 30, "Corte para niños menores de 12 años."),
    servicio("Corte Caballeros", "Cortes", 26000, 30, "Corte clásico con máquina y tijera."),
    servicio("Barba a Medida", "Barba", 22000, 30, "Recorte, forma y estilo con productos, delineado y terminaciones."),
    servicio("Afeitado Tradicional con Toalla Caliente", "Barba", 22000, 30, "Afeitado con navaja, toalla caliente y after shave."),
    servicio("Corte + Barba", "Corte de Cabello & Barba", 30000, 30, "Corte clásico con perfilado ligero de barba."),
    servicio("Corte + Afeitado Tradicional con Toalla Caliente", "Corte de Cabello & Barba", 35000, 60, "Corte clásico y afeitado tradicional con toalla caliente."),
    servicio("Cobertura de Canas", "Color", 44000, 30, "Resultado natural, discreto y sin efecto artificial."),
    servicio("Coloración", "Color", 110000, 120, "Coloración capilar de color a elección."),
    servicio("Corte + Cobertura de Canas", "Corte & Coloración", 66000, 60, "Corte clásico y cobertura de canas."),
    servicio("Corte + Coloración", "Corte & Coloración", 135000, 150, "Corte clásico y coloración capilar."),
  ],
];

async function crearDemo() {
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email: EMAIL } });
  const negocioExistente = await prisma.negocio.findUnique({ where: { slug: SLUG } });
  if (usuarioExistente || negocioExistente) {
    throw new Error("La cuenta o el negocio demo ya existe; no se modificó ningún dato.");
  }
  for (const sede of sedesDef) {
    const ocupada = await prisma.sede.findUnique({ where: { subdominio: sede.subdominio } });
    if (ocupada) throw new Error(`El subdominio ${sede.subdominio} ya está ocupado; no se modificó ningún dato.`);
  }

  const contrasena = await hashPassword(CLAVE);
  await prisma.$transaction(async (tx) => {
    const usuarioId = randomUUID();
    const usuario = await tx.usuario.create({
      data: {
        id: usuarioId,
        nombre: "Manly Demo",
        email: EMAIL,
        emailVerificado: true,
        cuentas: {
          create: {
            proveedor: "credential",
            cuentaProveedorId: usuarioId,
            contrasena,
          },
        },
      },
    });

    const ahora = new Date();
    const negocio = await tx.negocio.create({
      data: {
        slug: SLUG,
        nombre: "Manly Barber Studio",
        descripcion: "Una barbería sin vueltas: cortes a medida, barbería tradicional y cuidado personal en un espacio pensado para disfrutar cada visita.",
        email: "hola@manlybarberstudio.com.ar",
        telefono: "+54 11 3075 1168",
        zonaHoraria: "America/Argentina/Buenos_Aires",
        politicaContacto: "CUALQUIERA",
        publicado: true,
        membresias: { create: { usuarioId: usuario.id, rol: "DUENO", activo: true } },
        suscripcion: { create: { plan: "pro", estado: "ACTIVA", precioMensual: 14900 } },
      },
    });

    const sedes: Array<{
      id: string;
      nombre: string;
      googleMapsUrl: string | null;
    }> = [];
    for (const def of sedesDef) {
      const sede = await tx.sede.create({
        data: {
          negocioId: negocio.id,
          nombre: def.nombre,
          subdominio: def.subdominio,
          direccion: def.direccion,
          telefono: "+54 11 3075 1168",
          googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(def.direccion),
        },
      });
      sedes.push(sede);
      await tx.horarioSede.createMany({
        data: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
          negocioId: negocio.id,
          sedeId: sede.id,
          diaSemana,
          abre: def.abre,
          cierra: def.nombre.includes("Virrey") && diaSemana === 2 ? "22:00" : def.cierra,
          activo: true,
        })),
      });
    }

    const categorias = new Map<string, string>();
    const nombresCategorias = ["Cortes", "Barba", "Corte de Cabello & Barba", "Color", "Corte & Coloración", "Masajes", "Manos", "Pies"];
    for (const [orden, nombre] of nombresCategorias.entries()) {
      const categoria = await tx.categoriaServicio.create({ data: { negocioId: negocio.id, nombre, orden } });
      categorias.set(nombre, categoria.id);
    }

    const serviciosPorSede: Array<Map<string, { id: string; precio: number; minutos: number }>> = [];
    const todosLosServicios: Array<{ id: string; categoria: string; sedeIndex: number }> = [];
    for (const [sedeIndex, catalogo] of catalogos.entries()) {
      const mapa = new Map<string, { id: string; precio: number; minutos: number }>();
      for (const item of catalogo) {
        const creado = await tx.servicio.create({
          data: {
            negocioId: negocio.id,
            categoriaId: categorias.get(item.categoria),
            nombre: item.nombre,
            descripcion: item.descripcion,
            precio: item.precio,
            duracionMinutos: item.minutos,
            bufferMinutos: 0,
            activo: true,
            sedes: { create: { sedeId: sedes[sedeIndex]!.id } },
          },
        });
        mapa.set(item.nombre, { id: creado.id, precio: item.precio, minutos: item.minutos });
        todosLosServicios.push({ id: creado.id, categoria: item.categoria, sedeIndex });
      }
      serviciosPorSede.push(mapa);
    }

    const profesionalesPorSede: Array<Array<{ id: string; nombre: string }>> = [];
    for (const [sedeIndex, sedeDef] of sedesDef.entries()) {
      const equipo = [];
      for (const [nombre, apellido, especialidad, foto] of sedeDef.equipo) {
        const profesional = await tx.profesional.create({
          data: {
            negocioId: negocio.id,
            nombre,
            apellido: apellido || null,
            especialidad,
            foto: foto || null,
            biografia: nombre === "Lautaro"
              ? "Barbero y colorista con más de 7 años de experiencia, especializado en cortes con tijera y resultados precisos."
              : nombre === "Franco"
                ? "Barbero con más de 15 años de experiencia en cortes a máquina y tijera, barba y atención personalizada."
                : nombre === "Gabriel"
                  ? "Barbero con experiencia en cortes, barba y cuidado personal."
                  : "Profesional del equipo Manly Barber Studio.",
          },
        });
        equipo.push({ id: profesional.id, nombre: profesional.nombre });
        await tx.profesionalSede.create({ data: { profesionalId: profesional.id, sedeId: sedes[sedeIndex]!.id } });
        await tx.profesionalServicio.createMany({
          data: todosLosServicios
            .filter((item) => item.sedeIndex === sedeIndex)
            .map((item) => ({ profesionalId: profesional.id, servicioId: item.id })),
          skipDuplicates: true,
        });
        await tx.horarioProfesional.createMany({
          data: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
            negocioId: negocio.id,
            profesionalId: profesional.id,
            sedeId: sedes[sedeIndex]!.id,
            diaSemana,
            comienza: "10:00",
            termina: sedeDef.nombre.includes("Virrey") && diaSemana === 2 ? "22:00" : "20:00",
          })),
        });
      }
      profesionalesPorSede.push(equipo);
    }

    const nombres = ["Tomás", "Mateo", "Santiago", "Benjamín", "Joaquín", "Nicolás", "Lucas", "Franco", "Agustín", "Thiago", "Martín", "Lautaro", "Facundo", "Bruno", "Valentín", "Juan", "Pedro", "Dante", "Emiliano", "Ramiro", "Sofía", "Camila", "Lucía", "Martina", "Valentina", "Julieta", "Agustina", "Malena", "Florencia", "Victoria"];
    const apellidos = ["Gómez", "Pérez", "López", "Fernández", "Sosa", "Romero", "Díaz", "Álvarez", "Torres", "Acosta", "Benítez", "Molina"];
    const clientes = [];
    for (let i = 0; i < 90; i += 1) {
      clientes.push(await tx.cliente.create({
        data: {
          negocioId: negocio.id,
          nombre: nombres[i % nombres.length]!,
          apellido: apellidos[(i * 7) % apellidos.length]!,
          email: `cliente${String(i + 1).padStart(3, "0")}@demo.manly.local`,
          telefono: `+54 11 4000 ${String(1000 + i).slice(-4)}`,
          aceptaWhatsapp: true,
          puntos: (i * 35) % 1200,
          notas: "Cliente ficticio, registro creado para la cuenta de demostración.",
        },
      }));
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const opcionesNombre = ["Corte Caballeros", "Corte Junior (hasta 12 años)", "Barba a Medida", "Corte + Barba", "Afeitado Tradicional con Toalla Caliente"];
    let turnoIndice = 0;
    for (let desplazamiento = -14; desplazamiento <= 44; desplazamiento += 1) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + desplazamiento);
      if (fecha.getDay() === 0) continue;
      const cuentaSede = [0, 0, 0];
      for (let numeroDia = 0; numeroDia < 8; numeroDia += 1) {
        const sedeIndex = (numeroDia + Math.abs(desplazamiento)) % sedes.length;
        const posicion = cuentaSede[sedeIndex]!++;
        const sede = sedes[sedeIndex]!;
        const equipo = profesionalesPorSede[sedeIndex]!;
        const nombreServicio = opcionesNombre[(turnoIndice * 3 + numeroDia) % opcionesNombre.length]!;
        const definicion = serviciosPorSede[sedeIndex]!.get(nombreServicio) ?? serviciosPorSede[sedeIndex]!.get("Corte Caballeros")!;
        const hora = [10, 12, 15, 17][posicion]!;
        const inicio = new Date(fecha);
        inicio.setHours(hora, posicion % 2 === 1 ? 30 : 0, 0, 0);
        const fin = new Date(inicio.getTime() + definicion.minutos * 60_000);
        const profesional = equipo[(turnoIndice + numeroDia) % equipo.length]!;
        const cliente = clientes[(turnoIndice * 7 + 11) % clientes.length]!;
        const estado = inicio < new Date()
          ? turnoIndice % 17 === 0 ? "AUSENTE" : turnoIndice % 13 === 0 ? "CANCELADA" : "COMPLETADA"
          : turnoIndice % 11 === 0 ? "PENDIENTE_PAGO" : "CONFIRMADA";
        await tx.reserva.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            profesionalId: profesional.id,
            clienteId: cliente.id,
            codigo: randomUUID().slice(0, 8).toUpperCase(),
            estado,
            inicio,
            fin,
            total: definicion.precio,
            sena: 0,
            notas: "Turno ficticio de demostración.",
            servicios: {
              create: {
                servicioId: definicion.id,
                orden: 1,
                precio: definicion.precio,
                duracionMinutos: definicion.minutos,
              },
            },
          },
        });
        turnoIndice += 1;
      }
    }

    const productoDefs = [
      ["Matte Finish Pomade", "MAN-POM-MAT", 25000, 14500, "/demo/manly/matte-pomade.webp"],
      ["Crystal Clear Pomade", "MAN-POM-CRY", 25000, 14500, "/demo/manly/crystal-pomade.webp"],
      ["Fucking Powder", "MAN-POW-001", 25000, 12500, "/demo/manly/powder.webp"],
    ] as const;
    const productos = [];
    for (const [index, [nombre, sku, precio, costo, imagen]] of productoDefs.entries()) {
      const producto = await tx.producto.create({
        data: {
          negocioId: negocio.id,
          nombre,
          sku,
          precio,
          costo,
          imagen,
          descripcion: "Producto publicado en el catálogo oficial de Manly. El costo y el stock son datos simulados para esta demo.",
          ventaPublica: true,
        },
      });
      productos.push(producto);
      for (const sede of sedes) {
        const cantidad = 9 + ((index * 5 + sedes.indexOf(sede) * 3) % 12);
        await tx.existencia.create({ data: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, cantidad, minimo: 4 } });
        await tx.movimientoStock.create({
          data: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, tipo: "INGRESO", cantidad, referencia: "DEMO · Stock inicial ficticio", creadoEn: sumarDias(hoy, -24) },
        });
      }
    }

    for (let i = 0; i < 18; i += 1) {
      const sede = sedes[i % sedes.length]!;
      const producto = productos[i % productos.length]!;
      const cliente = clientes[(i * 5) % clientes.length]!;
      const fecha = sumarDias(hoy, -(i * 2 + 1));
      fecha.setHours(12 + (i % 7), (i % 2) * 30, 0, 0);
      const venta = await tx.venta.create({
        data: {
          negocioId: negocio.id,
          sedeId: sede.id,
          clienteId: cliente.id,
          profesionalId: profesionalesPorSede[i % 3]![i % profesionalesPorSede[i % 3]!.length]!.id,
          origen: i % 2 === 0 ? "EQUIPO" : "LOCAL",
          total: producto.precio,
          creadoEn: fecha,
          items: { create: { productoId: producto.id, concepto: producto.nombre, cantidad: 1, precio: producto.precio } },
        },
      });
      await tx.movimientoCaja.create({
        data: { negocioId: negocio.id, sedeId: sede.id, tipo: "INGRESO", concepto: `DEMO · Venta de ${producto.nombre}`, monto: producto.precio, origen: venta.origen, profesionalId: venta.profesionalId, creadoEn: fecha },
      });
      await tx.movimientoStock.create({
        data: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, tipo: "VENTA", cantidad: -1, referencia: venta.id, creadoEn: fecha },
      });
      await tx.existencia.update({
        where: { sedeId_productoId: { sedeId: sede.id, productoId: producto.id } },
        data: { cantidad: { decrement: 1 } },
      });
    }

    const gastos = ["Reposición de insumos", "Limpieza del local", "Servicios y mantenimiento"];
    for (let i = 0; i < 15; i += 1) {
      const sede = sedes[i % sedes.length]!;
      const monto = [48000, 32500, 62000][i % 3]!;
      const fecha = sumarDias(hoy, -(i * 3 + 2));
      await tx.movimientoCaja.create({
        data: { negocioId: negocio.id, sedeId: sede.id, tipo: "EGRESO", concepto: `DEMO · ${gastos[i % gastos.length]}`, monto, creadoEn: fecha },
      });
    }

    for (let i = 0; i < 6; i += 1) {
      const sede = sedes[i % sedes.length]!;
      const producto = productos[i % productos.length]!;
      const cantidad = 5 + (i % 4);
      const costo = Number(producto.costo ?? 14000);
      const fecha = sumarDias(hoy, -(i * 6 + 3));
      const total = costo * cantidad;
      const compra = await tx.compra.create({
        data: {
          negocioId: negocio.id,
          sedeId: sede.id,
          proveedor: "DEMO · Distribuidor de grooming",
          total,
          creadoEn: fecha,
          items: { create: { productoId: producto.id, nombre: producto.nombre, sku: producto.sku, cantidad, costo, subtotal: total } },
        },
      });
      await tx.movimientoCaja.create({
        data: { negocioId: negocio.id, sedeId: sede.id, tipo: "EGRESO", concepto: `DEMO · Compra ${compra.id.slice(-6)}`, monto: total, creadoEn: fecha },
      });
      await tx.existencia.update({
        where: { sedeId_productoId: { sedeId: sede.id, productoId: producto.id } },
        data: { cantidad: { increment: cantidad } },
      });
      await tx.movimientoStock.create({
        data: { negocioId: negocio.id, sedeId: sede.id, productoId: producto.id, tipo: "INGRESO", cantidad, referencia: `DEMO · Compra ${compra.id}`, creadoEn: fecha },
      });
    }

    const configuracionLocal = (sede: (typeof sedes)[number]) => ({
      titulo: "Manly Barber Studio",
      descripcion: "Una barbería sin vueltas, hecha para disfrutar cada visita.",
      colorTitulo: "#111111",
      colorSubtitulo: "#333333",
      colorPrincipal: "#111111",
      colorFondo: "#ffffff",
      colorTexto: "#111111",
      logoUrl: "/demo/manly/logo.jpg",
      whatsapp: "541130751168",
      instagram: "manlybarberstudio",
      googleMapsUrl: sede.googleMapsUrl,
      hero: [{ url: "/demo/manly/hero-cinematografico.webp", alt: "Interior cinematográfico de una barbería Manly, con sillones de cuero y luz cálida", focoX: 60, focoY: 50 }],
      secciones: ["servicios", "equipo", "contacto", "ubicacion"],
      versionSecciones: 2,
      serviciosDestacados: [],
    });
    const configuracion = {
      ...configuracionLocal(sedes[0]!),
      locales: Object.fromEntries(sedes.map((sede) => [sede.id, configuracionLocal(sede)])),
    };
    await tx.configuracionSitio.create({
      data: { negocioId: negocio.id, borrador: configuracion as Prisma.InputJsonValue, publicada: configuracion as Prisma.InputJsonValue, version: 1, publicadaEn: ahora },
    });
  }, { timeout: 120_000, maxWait: 15_000 });

  console.log("Cuenta local de demostración creada:");
  console.log(`  Email: ${EMAIL}`);
  console.log(`  Contraseña: ${CLAVE}`);
  console.log(`  Sitio: /sitio/${SLUG}`);
  console.log("  Las operaciones, el inventario y los turnos están simulados.");
}

function sumarDias(base: Date, dias: number) {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

crearDemo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
