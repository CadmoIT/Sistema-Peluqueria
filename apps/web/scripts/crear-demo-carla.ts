/** Crea la demo de Carla sin correos, pagos externos ni sobrescribir otras cuentas. Producción requiere confirmación y destino explícitos. */
import { existsSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, Prisma, type Producto } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const SLUG = "carla-cicero-demo";
const EMAIL = "carla.demo@example.com";
const EMAIL_EMPLEADA = "lucia.carla.demo@example.com";
const EMAIL_PENDIENTE = "valeria.carla.demo@example.com";
const CLAVE = process.env.CARLA_DEMO_PASSWORD || "CarlaDemo2026!";
const DIA = 86_400_000;
const ZONA = "America/Argentina/Buenos_Aires";
const LOGO = "/demo/carla/logo-clinica.png";
const HERO = "/demo/carla/hero-referencia.jpeg";

if (!process.env.DATABASE_URL && existsSync(".env.local"))
  process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL)
  throw new Error("Falta DATABASE_URL. No se modificó ningún dato.");
const conexion = new URL(process.env.DATABASE_URL);
const produccionConfirmada =
  process.env.CARLA_DEMO_PRODUCTION_CONFIRM === "crear-cuenta-demo-carla" &&
  conexion.hostname === "yamanote.proxy.rlwy.net" &&
  conexion.port === "50874" &&
  conexion.pathname === "/railway" &&
  !!process.env.CARLA_DEMO_PASSWORD &&
  process.env.CARLA_DEMO_PASSWORD.length >= 16;
if (
  !produccionConfirmada &&
  (process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(conexion.hostname) ||
    conexion.port !== "5433" ||
    conexion.pathname !== "/turnos_rapidos")
)
  throw new Error(
    "La demo sólo usa turnos_rapidos en PostgreSQL local, puerto 5433. No se modificó ningún dato.",
  );
const db = new PrismaClient();
const ahora = new Date();
const hoyTexto = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(ahora);
const hoy = new Date(`${hoyTexto}T00:00:00-03:00`);
function fecha(dias: number, hora = 12, minutos = 0) {
  return new Date(hoy.getTime() + dias * DIA + (hora * 60 + minutos) * 60_000);
}
function hash(valor: string) {
  return createHash("sha256").update(valor).digest("hex");
}

const catalogo = [
  {
    nombre: "Consulta de orientación y revisión de derivación",
    categoria: "Consultas",
    precio: 28000,
    minutos: 30,
    descripcion:
      "Espacio para revisar la solicitud del especialista y coordinar el circuito de atención. No reemplaza la indicación médica.",
  },
  {
    nombre: "Evaluación previa a elaboración autóloga",
    categoria: "Consultas",
    precio: 35000,
    minutos: 45,
    descripcion:
      "Turno de evaluación y coordinación del proceso según la derivación del equipo tratante.",
  },
  {
    nombre: "Elaboración de suero autólogo oftalmológico",
    categoria: "Oftalmología",
    precio: 95000,
    minutos: 60,
    descripcion:
      "Turno de elaboración bajo indicación del oftalmólogo. Requisitos y modalidad se confirman previamente con el equipo.",
  },
  {
    nombre: "Elaboración de PRP oftalmológico",
    categoria: "Oftalmología",
    precio: 125000,
    minutos: 60,
    descripcion:
      "Coordinación de preparados autólogos solicitados por el especialista. Servicio sujeto a evaluación e indicación profesional.",
  },
  {
    nombre: "Retiro programado de preparados",
    categoria: "Oftalmología",
    precio: 12000,
    minutos: 30,
    descripcion:
      "Entrega coordinada y revisión de las indicaciones aportadas por el equipo tratante. No incluye una nueva elaboración.",
  },
  {
    nombre: "Preparación de PRP para derivación traumatológica",
    categoria: "Traumatología",
    precio: 110000,
    minutos: 60,
    descripcion:
      "Turno de preparación y coordinación con el traumatólogo derivador. La aplicación y su indicación corresponden al equipo tratante.",
  },
  {
    nombre: "Coordinación de gel plaquetario para heridas",
    categoria: "Atención de heridas",
    precio: 105000,
    minutos: 60,
    descripcion:
      "Coordinación de una solicitud del equipo tratante, sujeta a evaluación previa. No se ofrecen resultados garantizados.",
  },
  {
    nombre: "Control y coordinación de continuidad",
    categoria: "Seguimiento",
    precio: 24000,
    minutos: 30,
    descripcion:
      "Seguimiento administrativo y coordinación de la continuidad indicada por el especialista.",
  },
];
const insumos = [
  {
    nombre: "Tubos de extracción estériles",
    sku: "CC-TUB-01",
    costo: 1900,
    inicial: 320,
    minimo: 40,
  },
  {
    nombre: "Frascos monodosis estériles",
    sku: "CC-MON-02",
    costo: 850,
    inicial: 260,
    minimo: 35,
  },
  {
    nombre: "Guantes de nitrilo · caja",
    sku: "CC-GUA-03",
    costo: 9800,
    inicial: 18,
    minimo: 5,
  },
  {
    nombre: "Gasas estériles · sobre",
    sku: "CC-GAS-04",
    costo: 650,
    inicial: 180,
    minimo: 25,
  },
  {
    nombre: "Kit descartable de preparación",
    sku: "CC-KIT-05",
    costo: 12500,
    inicial: 55,
    minimo: 12,
  },
  {
    nombre: "Bolsas para transporte de muestras",
    sku: "CC-BOL-06",
    costo: 1200,
    inicial: 110,
    minimo: 20,
  },
  {
    nombre: "Etiquetas de trazabilidad · rollo",
    sku: "CC-ETI-07",
    costo: 4500,
    inicial: 10,
    minimo: 3,
  },
  {
    nombre: "Contenedor térmico de entrega",
    sku: "CC-TER-08",
    costo: 7500,
    inicial: 28,
    minimo: 6,
  },
  {
    nombre: "Antiséptico · frasco",
    sku: "CC-ANT-09",
    costo: 5200,
    inicial: 4,
    minimo: 6,
  },
  {
    nombre: "Descartador de cortopunzantes",
    sku: "CC-DES-10",
    costo: 8400,
    inicial: 8,
    minimo: 3,
  },
];

async function crear() {
  const existente = await db.negocio.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      configuracion: true,
      membresias: { select: { usuario: { select: { email: true } } } },
    },
  });
  if (existente) {
    const config = existente.configuracion as Record<string, unknown> | null;
    if (
      config?.demoCarla !== true ||
      !existente.membresias.some((m) => m.usuario.email === EMAIL)
    )
      throw new Error("Ese slug pertenece a otro negocio. No se sobrescribió.");
    console.log(
      "La demo ya existe. Se conservaron sus datos y los cambios realizados.",
    );
    await informar(existente.id);
    return;
  }
  if (
    await db.usuario.count({
      where: { email: { in: [EMAIL, EMAIL_EMPLEADA, EMAIL_PENDIENTE] } },
    })
  )
    throw new Error(
      "Uno de los emails de demo ya está ocupado. No se modificaron cuentas existentes.",
    );
  if (await db.negocio.findUnique({ where: { subdominio: SLUG } }))
    throw new Error("El subdominio de la demo está ocupado.");
  const contrasena = await hashPassword(CLAVE);
  const negocioId = await db.$transaction(
    async (tx) => {
      async function cuenta(nombre: string, email: string) {
        const id = randomUUID();
        return tx.usuario.create({
          data: {
            id,
            nombre,
            email,
            emailVerificado: true,
            imagen: LOGO,
            cuentas: {
              create: {
                proveedor: "credential",
                cuentaProveedorId: id,
                contrasena,
              },
            },
          },
        });
      }
      const duena = await cuenta("Carla Cicero · Demo", EMAIL);
      const lucia = await cuenta("Lucía Méndez · Demo", EMAIL_EMPLEADA);
      const negocio = await tx.negocio.create({
        data: {
          slug: SLUG,
          subdominio: SLUG,
          nombreClave: "carla cicero",
          nombre: "Dra. Carla Cicero",
          descripcion:
            "Terapia celular y Medicina regenerativa. Coordinación de preparados autólogos para oftalmología, traumatología y atención de heridas, bajo indicación del especialista.",
          email: EMAIL,
          zonaHoraria: ZONA,
          publicado: true,
          politicaContacto: "EMAIL",
          configuracion: {
            demoCarla: true,
            datosFicticios: true,
            configuracionInicialCompleta: true,
            tipoNegocio: "consultorios",
            rubro: "Consultorio médico",
            cantidadLocales: 1,
            imagenPerfil: LOGO,
          },
          membresias: { create: { usuarioId: duena.id, rol: "DUENO" } },
          suscripcion: {
            create: {
              plan: "pro",
              estado: "ACTIVA",
              precioMensual: 0,
              primerPagoEn: fecha(-60),
              proximoCobro: fecha(365),
              cancelarAlFinal: false,
            },
          },
          configuracionAvisos: {
            create: {
              emailConfirmacionActivo: false,
              emailRecordatorioActivo: false,
              whatsappConfirmacionActivo: false,
              whatsappRecordatorioActivo: false,
            },
          },
        },
      });
      const sede = await tx.sede.create({
        data: {
          negocioId: negocio.id,
          nombre: "Consultorio Neuquén",
          direccion: "Neuquén 1939",
          googleMapsUrl:
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent("Neuquén 1939"),
          activa: true,
        },
      });
      await tx.horarioSede.createMany({
        data: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
          negocioId: negocio.id,
          sedeId: sede.id,
          diaSemana,
          abre: "09:00",
          cierra: diaSemana === 6 ? "13:00" : "18:00",
          activo: true,
        })),
      });
      const miembro = await tx.membresia.create({
        data: {
          usuarioId: lucia.id,
          negocioId: negocio.id,
          rol: "PROFESIONAL",
          aceptadaEn: fecha(-20),
        },
      });
      const profesionales = [];
      for (const [i, nombre] of ["Lucía", "Valeria"].entries()) {
        profesionales.push(
          await tx.profesional.create({
            data: {
              negocioId: negocio.id,
              nombre,
              apellido: i === 0 ? "Méndez" : "Suárez",
              membresiaId: i === 0 ? miembro.id : null,
              especialidad:
                i === 0
                  ? "Coordinación de hemoterapia"
                  : "Coordinación de atención y seguimiento",
              biografia:
                i === 0
                  ? "Integrante ficticia para demostrar la agenda personal, preparados autólogos y seguimiento del circuito de atención."
                  : "Integrante ficticia para demostrar la coordinación de derivaciones, turnos y continuidad de atención.",
              sedes: { create: { sedeId: sede.id } },
              horarios: {
                create: [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
                  negocioId: negocio.id,
                  sedeId: sede.id,
                  diaSemana,
                  comienza: "09:00",
                  termina: diaSemana === 6 ? "13:00" : "18:00",
                })),
              },
            },
          }),
        );
      }
      const p0 = profesionales[0]!,
        p1 = profesionales[1]!;
      await tx.invitacionEquipo.create({
        data: {
          negocioId: negocio.id,
          profesionalId: p0.id,
          email: EMAIL_EMPLEADA,
          tokenHash: hash(randomBytes(32).toString("hex")),
          estado: "ACEPTADA",
          creadoPorId: duena.id,
          aceptadaPorId: lucia.id,
          creadaEn: fecha(-21),
          aceptadaEn: fecha(-20),
          expiraEn: fecha(-14),
          correoClave: `demo-carla-aceptada-${negocio.id}`,
        },
      });
      await tx.invitacionEquipo.create({
        data: {
          negocioId: negocio.id,
          profesionalId: p1.id,
          email: EMAIL_PENDIENTE,
          tokenHash: hash(randomBytes(32).toString("hex")),
          estado: "PENDIENTE",
          creadoPorId: duena.id,
          creadaEn: ahora,
          expiraEn: new Date(ahora.getTime() + 7 * DIA),
          correoClave: `demo-carla-pendiente-${negocio.id}`,
        },
      });
      // Los estados son simulados; no se crea correo en la bandeja ni un enlace utilizable.
      const categorias = new Map<string, string>();
      for (const nombre of new Set(catalogo.map((s) => s.categoria))) {
        const c = await tx.categoriaServicio.create({
          data: { negocioId: negocio.id, nombre, orden: categorias.size },
        });
        categorias.set(nombre, c.id);
      }
      const servicios = [];
      for (const s of catalogo)
        servicios.push(
          await tx.servicio.create({
            data: {
              negocioId: negocio.id,
              categoriaId: categorias.get(s.categoria),
              nombre: s.nombre,
              descripcion:
                s.descripcion +
                " Valor y prestación de ejemplo para esta demostración.",
              precio: s.precio,
              duracionMinutos: s.minutos,
              bufferMinutos: 15,
              porcentajeSena: 20,
              sedes: { create: { sedeId: sede.id } },
              profesionales: {
                create: profesionales.map((p) => ({ profesionalId: p.id })),
              },
            },
          }),
        );
      const nombres = [
        "Ana",
        "Carlos",
        "María",
        "Diego",
        "Laura",
        "Roberto",
        "Elena",
        "Martín",
        "Patricia",
        "Gabriel",
        "Silvia",
        "Andrés",
        "Cecilia",
        "Jorge",
        "Adriana",
        "Pablo",
        "Beatriz",
        "Daniel",
        "Florencia",
        "Héctor",
      ];
      const apellidos = [
        "Gómez",
        "Pérez",
        "López",
        "Romero",
        "Fernández",
        "Torres",
        "Sosa",
        "Díaz",
        "Acosta",
        "Molina",
        "Benítez",
        "Vega",
      ];
      const clientes = [];
      for (let i = 0; i < 64; i++)
        clientes.push(
          await tx.cliente.create({
            data: {
              negocioId: negocio.id,
              nombre: nombres[i % nombres.length],
              apellido:
                apellidos[
                  (i * 5 + Math.floor(i / nombres.length)) % apellidos.length
                ],
              email: `paciente${i + 1}.carla@example.com`,
              telefono: null,
              aceptaWhatsapp: false,
              notas:
                "Ficha ficticia de presentación. Sin información clínica real.",
              creadoEn: fecha(-60 + (i % 25)),
            },
          }),
        );
      async function actividad(
        accion: string,
        recurso: string,
        recursoId: string,
        dia: Date,
        pId?: string,
        detalle?: Prisma.InputJsonValue,
        compartida = false,
        actor = duena,
      ) {
        await tx.auditoria.create({
          data: {
            negocioId: negocio.id,
            usuarioId: actor.id,
            actorNombre: actor.nombre,
            sedeId: sede.id,
            profesionalId: pId ?? null,
            accion,
            recurso,
            recursoId,
            creadaEn: dia,
            visibilidad: compartida ? "COMPARTIDA" : "PERSONAL",
            detalle,
          },
        });
      }
      let numero = 0;
      for (let d = -45; d <= 21; d++) {
        const semana = new Date(
          hoy.getTime() + d * DIA + 12 * 3600_000,
        ).getUTCDay();
        if (semana === 0) continue;
        const horas =
          semana === 6 ? [9, 10.25, 11.5] : [9, 10.25, 11.5, 14, 15.25];
        for (const [pi, p] of profesionales.entries())
          for (const h of horas) {
            const s = servicios[(numero + pi * 3) % servicios.length]!;
            const cliente = clientes[(numero * 7 + pi) % clientes.length]!;
            const inicio = fecha(
              d,
              Math.floor(h),
              Math.round((h % 1) * 60) + pi * 15,
            );
            const fin = new Date(inicio.getTime() + s.duracionMinutos * 60_000);
            const pasada = fin < ahora;
            const estado = pasada
              ? numero % 23 === 0
                ? "CANCELADA"
                : numero % 19 === 0
                  ? "AUSENTE"
                  : "COMPLETADA"
              : numero % 17 === 0
                ? "PENDIENTE_PAGO"
                : "CONFIRMADA";
            const sena = Number(s.precio) * 0.2;
            const reserva = await tx.reserva.create({
              data: {
                negocioId: negocio.id,
                sedeId: sede.id,
                profesionalId: p.id,
                clienteId: cliente.id,
                codigo: `CC${String(++numero).padStart(5, "0")}`,
                estado,
                inicio,
                fin,
                total: s.precio,
                sena,
                creadoEn: new Date(inicio.getTime() - 3 * DIA),
                notas:
                  "Turno de muestra. Derivación y requisitos se coordinan previamente; sin diagnóstico real.",
                servicios: {
                  create: {
                    servicioId: s.id,
                    orden: 1,
                    precio: s.precio,
                    duracionMinutos: s.duracionMinutos,
                  },
                },
              },
            });
            if (estado === "CANCELADA") continue;
            await tx.profesionalCliente.upsert({
              where: {
                profesionalId_clienteId: {
                  profesionalId: p.id,
                  clienteId: cliente.id,
                },
              },
              create: {
                profesionalId: p.id,
                clienteId: cliente.id,
                notas:
                  pi === 0
                    ? "Coordinación de elaboración y retiro. Nota de ejemplo exclusiva de Lucía."
                    : "Revisar disponibilidad para control. Nota de ejemplo exclusiva de Valeria.",
              },
              update: {},
            });
            if (estado === "PENDIENTE_PAGO" || estado === "AUSENTE") continue;
            const conSena = numero % 3 === 0;
            if (conSena)
              await tx.pago.create({
                data: {
                  negocioId: negocio.id,
                  reservaId: reserva.id,
                  proveedor: "demo",
                  idempotencia: `demo-sena-${reserva.id}`,
                  estado: "APROBADO",
                  monto: sena,
                  pagadoEn: new Date(inicio.getTime() - 2 * DIA),
                  creadoEn: new Date(inicio.getTime() - 2 * DIA),
                },
              });
            if (pasada) {
              const abonado = Number(s.precio) - (conSena ? sena : 0);
              const monto =
                numero % 11 === 0 ? Math.round(abonado / 2) : abonado;
              const actor = pi === 0 && numero % 4 !== 0 ? lucia : duena;
              const movimiento = await tx.movimientoCaja.create({
                data: {
                  negocioId: negocio.id,
                  sedeId: sede.id,
                  profesionalId: p.id,
                  actorUsuarioId: actor.id,
                  tipo: "INGRESO",
                  origen: "EQUIPO",
                  concepto: `Cobro · ${s.nombre}`,
                  monto,
                  operacionId: reserva.id,
                  creadoEn: fin,
                },
              });
              const cobro = await tx.cobroReserva.create({
                data: {
                  negocioId: negocio.id,
                  sedeId: sede.id,
                  profesionalId: p.id,
                  reservaId: reserva.id,
                  actorUsuarioId: actor.id,
                  monto,
                  medio: numero % 2 ? "TRANSFERENCIA" : "EFECTIVO",
                  idempotencia: `demo-cobro-${reserva.id}`,
                  solicitudHash: hash(`demo:${reserva.id}:${monto}`),
                  movimientoId: movimiento.id,
                  creadoEn: fin,
                },
              });
              await actividad(
                "COBRAR_TURNO",
                "cobro",
                cobro.id,
                fin,
                p.id,
                { concepto: s.nombre, monto, demo: true },
                false,
                actor,
              );
            }
          }
      }
      // Prestaciones administrativas de ejemplo, distintas de los turnos cobrados.
      for (let i = 0; i < 18; i++) {
        const pi = i % 2,
          profesional = profesionales[pi]!,
          actor = pi ? duena : lucia;
        const servicio = servicios[i % 8]!,
          dia = fecha(-36 + i * 2, 16);
        const venta = await tx.venta.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            profesionalId: profesional.id,
            clienteId: clientes[(i * 3) % clientes.length]!.id,
            actorUsuarioId: actor.id,
            total: servicio.precio,
            origen: "EQUIPO",
            creadoEn: dia,
            idempotencia: randomUUID(),
            solicitudHash: hash(`venta-demo:${i}`),
            items: {
              create: {
                concepto:
                  servicio.nombre + " · Prestación independiente de ejemplo",
                cantidad: 1,
                precio: servicio.precio,
              },
            },
          },
        });
        await tx.movimientoCaja.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            profesionalId: profesional.id,
            actorUsuarioId: actor.id,
            operacionId: venta.id,
            tipo: "INGRESO",
            origen: "EQUIPO",
            concepto: "Prestación independiente · " + servicio.nombre,
            monto: servicio.precio,
            creadoEn: dia,
          },
        });
        await actividad(
          "REGISTRAR_VENTA",
          "venta",
          venta.id,
          dia,
          profesional.id,
          {
            concepto: servicio.nombre,
            total: Number(servicio.precio),
            demo: true,
          },
          false,
          actor,
        );
      }
      const columnas = [];
      for (const [i, nombre] of ["Lote", "Vencimiento", "Ubicación"].entries())
        columnas.push(
          await tx.columnaInventario.create({
            data: {
              negocioId: negocio.id,
              nombre,
              tipo: i === 1 ? "FECHA" : "TEXTO",
              orden: i,
            },
          }),
        );
      const productos: Producto[] = [];
      for (const [i, def] of insumos.entries()) {
        const producto = await tx.producto.create({
          data: {
            negocioId: negocio.id,
            nombre: def.nombre,
            sku: def.sku,
            descripcion:
              "Insumo ficticio para demostrar compras, consumo y trazabilidad. No se vende al público.",
            precio: def.costo,
            costo: def.costo,
            ventaPublica: false,
          },
        });
        productos.push(producto);
        await tx.existencia.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            productoId: producto.id,
            cantidad: def.inicial,
            minimo: def.minimo,
          },
        });
        await tx.movimientoStock.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            productoId: producto.id,
            tipo: "INGRESO",
            cantidad: def.inicial,
            referencia: "DEMO · Inventario inicial",
            creadoEn: fecha(-60),
          },
        });
        await tx.valorColumnaInventario.createMany({
          data: [
            {
              productoId: producto.id,
              columnaId: columnas[0]!.id,
              valor: `DEMO-CC-${i + 1}`,
            },
            {
              productoId: producto.id,
              columnaId: columnas[1]!.id,
              valor: fecha(120 + i * 20)
                .toISOString()
                .slice(0, 10),
            },
            {
              productoId: producto.id,
              columnaId: columnas[2]!.id,
              valor:
                i % 2
                  ? "Depósito / estante B"
                  : "Área de preparación / estante A",
            },
          ],
        });
      }
      for (let i = 0; i < 8; i++) {
        const dia = fecha(-28 + i * 3, 10),
          actor = i % 2 ? lucia : duena;
        const indices = [i % 7, (i + 3) % 7];
        const items = indices.map((j) => ({
          producto: productos[j]!,
          def: insumos[j]!,
          cantidad: j < 2 ? 30 : 4,
        }));
        const total = items.reduce((s, x) => s + x.cantidad * x.def.costo, 0);
        const compra = await tx.compra.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            actorUsuarioId: actor.id,
            proveedor: [
              "Proveedor de insumos A · Demo",
              "Distribuidora de descartables B · Demo",
            ][i % 2],
            total,
            creadoEn: dia,
            idempotencia: randomUUID(),
            solicitudHash: hash(`compra-demo:${i}`),
            items: {
              create: items.map((x) => ({
                productoId: x.producto.id,
                nombre: x.producto.nombre,
                sku: x.producto.sku,
                cantidad: x.cantidad,
                costo: x.def.costo,
                subtotal: x.cantidad * x.def.costo,
              })),
            },
          },
        });
        await tx.movimientoCaja.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            tipo: "EGRESO",
            origen: "LOCAL",
            actorUsuarioId: actor.id,
            operacionId: compra.id,
            concepto: "Compra de insumos · " + compra.proveedor,
            monto: total,
            creadoEn: dia,
          },
        });
        for (const x of items) {
          await tx.existencia.update({
            where: {
              sedeId_productoId: { sedeId: sede.id, productoId: x.producto.id },
            },
            data: { cantidad: { increment: x.cantidad } },
          });
          await tx.movimientoStock.create({
            data: {
              negocioId: negocio.id,
              sedeId: sede.id,
              productoId: x.producto.id,
              tipo: "INGRESO",
              cantidad: x.cantidad,
              referencia: compra.id,
              creadoEn: dia,
            },
          });
        }
        await actividad(
          "REGISTRAR_COMPRA",
          "compra",
          compra.id,
          dia,
          undefined,
          { proveedor: compra.proveedor, total, demo: true },
          true,
          actor,
        );
      }
      for (let i = 0; i < 38; i++) {
        const j = i % 2,
          producto = productos[j]!,
          cantidad = (i % 3) + 1,
          dia = fecha(-18 + Math.floor(i / 2), 12);
        const referencia = randomUUID();
        await tx.existencia.update({
          where: {
            sedeId_productoId: { sedeId: sede.id, productoId: producto.id },
          },
          data: { cantidad: { decrement: cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            productoId: producto.id,
            tipo: "CONSUMO",
            cantidad: -cantidad,
            referencia,
            creadoEn: dia,
          },
        });
        await actividad(
          "CONSUMO_STOCK",
          "stock",
          referencia,
          dia,
          profesionales[j]!.id,
          {
            producto: producto.nombre,
            cantidad,
            motivo: "Preparación programada · consumo de muestra",
          },
          true,
          j ? duena : lucia,
        );
      }
      for (const [i, concepto] of [
        "Limpieza del consultorio",
        "Mantenimiento de equipamiento",
        "Servicios del consultorio",
        "Transporte y logística",
        "Reposición de papelería",
      ].entries()) {
        const monto = [62000, 85000, 54000, 32000, 18000][i]!;
        await tx.movimientoCaja.create({
          data: {
            negocioId: negocio.id,
            sedeId: sede.id,
            tipo: "EGRESO",
            origen: "LOCAL",
            concepto: concepto + " · Demo",
            monto,
            actorUsuarioId: duena.id,
            creadoEn: fecha(-24 + i * 4),
          },
        });
      }
      const proximoLunes = Array.from({ length: 7 }, (_, i) => i + 1).find(
        (i) => fecha(i).getUTCDay() === 1,
      )!;
      await tx.bloqueoAgenda.create({
        data: {
          negocioId: negocio.id,
          profesionalId: p0.id,
          inicio: fecha(proximoLunes, 16.5),
          fin: fecha(proximoLunes, 17),
          motivo: "Revisión de stock y trazabilidad · Demo",
        },
      });
      await tx.bloqueoAgenda.create({
        data: {
          negocioId: negocio.id,
          profesionalId: p1.id,
          inicio: fecha(proximoLunes, 17),
          fin: fecha(proximoLunes, 17.5),
          motivo: "Coordinación con especialistas · Demo",
        },
      });
      await actividad(
        "ACEPTAR_INVITACION",
        "profesional",
        p0.id,
        fecha(-20),
        p0.id,
        {
          demo: true,
          estado: "Cuenta vinculada: aceptación simulada para la presentación",
        },
        false,
        lucia,
      );
      await actividad(
        "INVITAR_EQUIPO",
        "profesional",
        p1.id,
        ahora,
        undefined,
        {
          demo: true,
          estado: "Invitación pendiente simulada; no se envió correo",
        },
      );
      const configuracion = {
        titulo: "Dra. Carla Cicero",
        descripcion:
          "Terapia celular y Medicina regenerativa. Atención coordinada, preparados autólogos y acompañamiento en cada etapa.",
        colorTitulo: "#552047",
        colorSubtitulo: "#665460",
        colorPrincipal: "#702458",
        colorFondo: "#fffdfd",
        colorTexto: "#332c33",
        logoUrl: LOGO,
        googleMapsUrl: sede.googleMapsUrl,
        hero: [
          {
            url: HERO,
            alt: "Imagen de referencia aportada para la presentación del consultorio",
            focoX: 60,
            focoY: 50,
          },
        ],
        secciones: ["servicios", "equipo", "contacto", "ubicacion"],
        versionSecciones: 2,
        serviciosDestacados: servicios.slice(0, 4).map((s) => s.id),
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
      return negocio.id;
    },
    { timeout: produccionConfirmada ? 900_000 : 180_000, maxWait: 15_000 },
  );
  await informar(negocioId);
}
async function informar(negocioId: string) {
  const [turnos, clientes, productos, compras] = await Promise.all([
    db.reserva.count({ where: { negocioId } }),
    db.cliente.count({ where: { negocioId } }),
    db.producto.count({ where: { negocioId } }),
    db.compra.count({ where: { negocioId } }),
  ]);
  console.log(
    JSON.stringify(
      {
        demo: "Carla Cicero",
        duena: EMAIL,
        empleadaVinculada: EMAIL_EMPLEADA,
        invitacionPendiente: EMAIL_PENDIENTE,
        claveDemo: CLAVE,
        sitio: `/sitio/${SLUG}`,
        panel: "/panel/resumen",
        datos: { turnos, clientes, productos, compras },
        aviso:
          "Datos y precios ficticios. Sin correos ni operaciones externas.",
      },
      null,
      2,
    ),
  );
}
crear()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "No se creó la demo.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
