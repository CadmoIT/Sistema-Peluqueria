/** Ejecutar sólo con PRUEBAS_EQUIPO=1 y PostgreSQL local aislado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { crearEquipoPrueba } from "../../pruebas/equipo-fixture";
import {
  aceptarInvitacionEquipo,
  invitarEquipo,
  cancelarInvitacionEquipo,
  revocarAccesoEquipo,
  hashInvitacion,
} from "./invitaciones-equipo.service";
import { lecturasEquipo } from "./lecturas-equipo.service";
import {
  registrarConsumoEquipo,
  comprarEquipo,
  cobrarTurnoEquipo,
  anularOperacionEquipo,
  importeEquipo,
} from "./operaciones-equipo.service";
import { vender } from "./ventas-operaciones.service";
import { clienteParaTurnoEquipo } from "./clientes-equipo.service";
import {
  guardarHorarioEquipo,
  bloquearAgendaEquipo,
} from "./agenda-equipo.service";
import { eliminarFicha } from "./eliminacion-fichas.service";
test(
  "cuentas y operaciones del equipo en PostgreSQL aislado",
  { skip: process.env.PRUEBAS_EQUIPO !== "1" },
  async (t) => {
    const db = new PrismaClient();
    const f = await crearEquipoPrueba(db);
    const flag = process.env.CUENTAS_EQUIPO_HABILITADAS;
    process.env.CUENTAS_EQUIPO_HABILITADAS = "true";
    try {
      const dueno = await f.contexto(f.dueno.id),
        admin = await f.contexto(f.admin.id);
      const credencial = (n: number) => ({
        id: f.empleados[n]!.usuario.id,
        email: f.empleados[n]!.usuario.email,
        emailVerified: true,
      });
      const token = async (id: string) => {
        const i = await db.invitacionEquipo.findUniqueOrThrow({
          where: { id },
        });
        const correo = await db.correoPendiente.findUniqueOrThrow({
          where: { claveIdempotencia: i.correoClave },
        });
        const valor = correo.texto!.match(
          /\/invitaciones\/([a-f0-9]{64})/,
        )![1]!;
        assert.equal(i.tokenHash, hashInvitacion(valor));
        assert.notEqual(i.tokenHash, valor);
        return valor;
      };
      await t.test(
        "sin email no hay cuenta; email inválido y administrador no generan correos",
        async () => {
          assert.equal(
            await db.membresia.count({
              where: { usuarioId: f.empleados[0]!.usuario.id },
            }),
            0,
          );
          await assert.rejects(() =>
            invitarEquipo(
              db,
              dueno,
              "mal-email",
              f.empleados[0]!.profesional.id,
            ),
          );
          await assert.rejects(
            () =>
              invitarEquipo(
                db,
                admin,
                f.empleados[0]!.usuario.email,
                f.empleados[0]!.profesional.id,
              ),
            /permiso/,
          );
          process.env.CUENTAS_EQUIPO_HABILITADAS = "false";
          await assert.rejects(
            () =>
              invitarEquipo(
                db,
                dueno,
                f.empleados[0]!.usuario.email,
                f.empleados[0]!.profesional.id,
              ),
            /habilitación/,
          );
          process.env.CUENTAS_EQUIPO_HABILITADAS = "true";
        },
      );
      const pendiente = await invitarEquipo(
          db,
          dueno,
          f.empleados[0]!.usuario.email,
          f.empleados[0]!.profesional.id,
        ),
        enlace = await token(pendiente);
      await t.test(
        "enviar no vincula; exige email coincidente y verificado",
        async () => {
          assert.equal(
            (
              await db.profesional.findUniqueOrThrow({
                where: { id: f.empleados[0]!.profesional.id },
              })
            ).membresiaId,
            null,
          );
          await assert.rejects(
            () => aceptarInvitacionEquipo(db, enlace, credencial(1)),
            /email/,
          );
          await assert.rejects(
            () =>
              aceptarInvitacionEquipo(db, enlace, {
                ...credencial(0),
                emailVerified: false,
              }),
            /Verificá/,
          );
        },
      );
      await t.test(
        "aceptación simultánea y repetida vincula una cuenta sin otro negocio ni prueba",
        async () => {
          const antes = await db.negocio.count();
          const aceptaciones = await Promise.all([
            aceptarInvitacionEquipo(db, enlace, credencial(0)),
            aceptarInvitacionEquipo(db, enlace, credencial(0)),
          ]);
          assert.deepEqual(aceptaciones, [f.negocio.id, f.negocio.id]);
          assert.equal(await db.negocio.count(), antes);
          assert.equal(
            await db.membresia.count({
              where: { usuarioId: credencial(0).id, negocioId: f.negocio.id },
            }),
            1,
          );
          assert.ok(
            (
              await db.membresia.findFirstOrThrow({
                where: { usuarioId: credencial(0).id },
              })
            ).aceptadaEn,
          );
        },
      );
      const empleado = await f.contexto(credencial(0).id),
        segundo = await f.vincular(1);
      for (const indice of [2, 3, 4]) await f.vincular(indice);
      await t.test(
        "revocar no desactiva ni borra turnos; sólo otra invitación aceptada restablece",
        async () => {
          await revocarAccesoEquipo(
            db,
            dueno,
            empleado.identidad.profesionalId!,
          );
          assert.equal(
            (
              await db.membresia.findUniqueOrThrow({
                where: { id: empleado.membresia.id },
              })
            ).activo,
            false,
          );
          assert.equal(
            (
              await db.profesional.findUniqueOrThrow({
                where: { id: empleado.identidad.profesionalId! },
              })
            ).activo,
            true,
          );
          assert.ok(
            await db.reserva.findUnique({ where: { id: f.reserva.id } }),
          );
          await assert.rejects(
            () => aceptarInvitacionEquipo(db, enlace, credencial(0)),
            /disponible/,
          );
          await db.invitacionEquipo.update({
            where: { id: pendiente },
            data: { creadaEn: new Date(Date.now() - 61000) },
          });
          const nuevo = await invitarEquipo(
            db,
            dueno,
            credencial(0).email,
            empleado.identidad.profesionalId!,
          );
          await aceptarInvitacionEquipo(db, await token(nuevo), credencial(0));
        },
      );
      await t.test(
        "reenvío invalida el enlace anterior y frena el correo pendiente",
        async () => {
          const p = await db.profesional.create({
            data: { negocioId: f.negocio.id, nombre: "Por invitar" },
          });
          const primero = await invitarEquipo(
              db,
              dueno,
              `nuevo-${randomUUID()}@example.com`,
              p.id,
            ),
            anterior = await token(primero);
          await assert.rejects(
            () => invitarEquipo(db, dueno, credencial(0).email, p.id),
            /minuto/,
          );
          await db.invitacionEquipo.update({
            where: { id: primero },
            data: { creadaEn: new Date(Date.now() - 61000) },
          });
          const segundoEnvio = await invitarEquipo(
            db,
            dueno,
            credencial(0).email,
            p.id,
          );
          const i = await db.invitacionEquipo.findUniqueOrThrow({
            where: { id: primero },
          });
          assert.equal(i.estado, "REVOCADA");
          assert.equal(
            (
              await db.correoPendiente.findUniqueOrThrow({
                where: { claveIdempotencia: i.correoClave },
              })
            ).expiraEn!.getTime(),
            0,
          );
          await assert.rejects(() =>
            aceptarInvitacionEquipo(db, anterior, credencial(0)),
          );
          await db.invitacionEquipo.update({
            where: { id: segundoEnvio },
            data: { expiraEn: new Date(0) },
          });
          const vencido = await token(segundoEnvio);
          await assert.rejects(
            () => aceptarInvitacionEquipo(db, vencido, credencial(0)),
            /venció/,
          );
          await cancelarInvitacionEquipo(db, dueno, p.id);
          assert.equal(
            (
              await db.invitacionEquipo.findUniqueOrThrow({
                where: { id: segundoEnvio },
              })
            ).estado,
            "REVOCADA",
          );
        },
      );
      await t.test(
        "filtros y agregaciones no recuperan clientes, notas, cobros ni agendas ajenas",
        async () => {
          const propia = lecturasEquipo(empleado, db),
            ajena = lecturasEquipo(segundo, db);
          const fichas = await propia.cliente.findMany();
          assert.equal(fichas.length, 1);
          assert.equal(fichas[0]!.notas, "Nota del barbero 1");
          assert.equal(
            (await ajena.cliente.findUnique({
              where: { id: f.clientes[0]!.id },
            }))!.notas,
            "Nota del barbero 2",
          );
          assert.equal(
            await propia.cliente.findUnique({
              where: { id: f.clientes[1]!.id },
            }),
            null,
          );
          assert.equal(await propia.cliente.count(), 1);
          assert.equal(await ajena.reserva.count(), 0);
          assert.equal(
            await propia.reserva.count({
              where: { profesionalId: segundo.identidad.profesionalId },
            }),
            0,
          );
          assert.equal(await propia.sede.count(), 2);
          assert.equal(await ajena.sede.count(), 1);
          await assert.rejects(() => propia.usuario.findMany(), /habilitada/);
          await assert.rejects(
            () =>
              propia.producto.update({
                where: { id: f.producto.id },
                data: { precio: 1 },
              }),
            /lecturas/,
          );
        },
      );
      await t.test(
        "un contacto exacto vincula sin duplicar; contacto ambiguo o ID ajeno falla",
        async () => {
          await assert.rejects(
            () =>
              db.$transaction((tx) =>
                clienteParaTurnoEquipo(
                  tx,
                  empleado,
                  empleado.identidad.profesionalId!,
                  {
                    id: f.clientes[1]!.id,
                    nombre: "",
                    email: "",
                    telefono: "",
                  },
                ),
              ),
            /disponible/,
          );
          const ficha = await db.$transaction((tx) =>
            clienteParaTurnoEquipo(
              tx,
              empleado,
              empleado.identidad.profesionalId!,
              {
                id: "",
                nombre: "No sobrescribir",
                email: f.clientes[1]!.email!,
                telefono: "",
              },
            ),
          );
          assert.equal(ficha.id, f.clientes[1]!.id);
          assert.deepEqual(Object.keys(ficha), ["id"]);
          assert.equal(
            (
              await db.cliente.findUniqueOrThrow({
                where: { id: ficha.id },
                select: { nombre: true },
              })
            ).nombre,
            "Cliente 1",
          );
          await db.cliente.create({
            data: { negocioId: f.negocio.id, email: f.clientes[2]!.email },
          });
          await assert.rejects(
            () =>
              db.$transaction((tx) =>
                clienteParaTurnoEquipo(
                  tx,
                  empleado,
                  empleado.identidad.profesionalId!,
                  {
                    id: "",
                    nombre: "",
                    email: f.clientes[2]!.email!,
                    telefono: "",
                  },
                ),
              ),
            /varias fichas/,
          );
        },
      );
      await t.test(
        "seña + cobro parcial + cobros concurrentes nunca sobrepasan el total",
        async () => {
          const e = {
            reservaId: f.reserva.id,
            monto: "300",
            medio: "EFECTIVO",
            idempotencia: randomUUID(),
          };
          const [a, b] = await Promise.all([
            cobrarTurnoEquipo(db, dueno, e),
            cobrarTurnoEquipo(db, dueno, e),
          ]);
          assert.equal(a.id, b.id);
          assert.equal(a.profesionalId, empleado.identidad.profesionalId);
          assert.equal(a.actorUsuarioId, dueno.usuario.id);
          const resultados = await Promise.allSettled([
            cobrarTurnoEquipo(db, empleado, {
              ...e,
              monto: "400",
              idempotencia: randomUUID(),
            }),
            cobrarTurnoEquipo(db, empleado, {
              ...e,
              monto: "400",
              idempotencia: randomUUID(),
            }),
          ]);
          assert.equal(
            resultados.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            Number(
              (
                await db.cobroReserva.aggregate({
                  where: { reservaId: f.reserva.id },
                  _sum: { monto: true },
                })
              )._sum.monto,
            ),
            700,
          );
          await assert.rejects(
            () =>
              cobrarTurnoEquipo(db, segundo, {
                ...e,
                idempotencia: randomUUID(),
              }),
            /cuenta/,
          );
          await assert.rejects(
            () => anularOperacionEquipo(db, admin, "cobro", a.id, "Error"),
            /permiso/,
          );
          await anularOperacionEquipo(
            db,
            dueno,
            "cobro",
            a.id,
            "Importe equivocado",
          );
          await anularOperacionEquipo(db, dueno, "cobro", a.id, "Reintento");
          assert.equal(
            await db.movimientoCaja.count({
              where: { reversaDeId: a.movimientoId },
            }),
            1,
          );
          assert.ok(
            (await db.cobroReserva.findUniqueOrThrow({ where: { id: a.id } }))
              .anuladoEn,
          );
          assert.equal(
            (
              await db.pago.findFirstOrThrow({
                where: { reservaId: f.reserva.id },
              })
            ).estado,
            "APROBADO",
          );
        },
      );
      await t.test(
        "venta versus consumo de la última unidad sólo confirma una operación",
        async () => {
          await db.existencia.update({
            where: {
              sedeId_productoId: {
                sedeId: f.sedes[0]!.id,
                productoId: f.producto.id,
              },
            },
            data: { cantidad: 1 },
          });
          const r = await Promise.allSettled([
            vender(
              db,
              f.negocio.id,
              {
                sedeId: f.sedes[0]!.id,
                atribucion: segundo.identidad.profesionalId!,
                items: [{ id: f.producto.id, tipo: "producto", cantidad: 1 }],
                idempotencia: randomUUID(),
              },
              empleado,
            ),
            registrarConsumoEquipo(db, segundo, {
              sedeId: f.sedes[0]!.id,
              productoId: f.producto.id,
              cantidad: 1,
              motivo: "Uso durante corte",
              idempotencia: randomUUID(),
            }),
          ]);
          assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
          assert.equal(
            (
              await db.existencia.findUniqueOrThrow({
                where: {
                  sedeId_productoId: {
                    sedeId: f.sedes[0]!.id,
                    productoId: f.producto.id,
                  },
                },
              })
            ).cantidad,
            0,
          );
          const ventas = await db.venta.findMany({
            where: { negocioId: f.negocio.id },
          });
          if (ventas.length)
            assert.equal(
              ventas[0]!.profesionalId,
              empleado.identidad.profesionalId,
            );
        },
      );
      await t.test(
        "compra repetida aumenta stock y egresa una sola vez; no afecta ingresos personales",
        async () => {
          const e = {
            sedeId: f.sedes[0]!.id,
            proveedor: "Proveedor",
            idempotencia: randomUUID(),
            items: [{ productoId: f.producto.id, cantidad: 5, costo: "100" }],
          };
          const [a, b] = await Promise.all([
            comprarEquipo(db, segundo, e),
            comprarEquipo(db, segundo, e),
          ]);
          assert.equal(a.id, b.id);
          assert.equal(
            (
              await db.existencia.findUniqueOrThrow({
                where: {
                  sedeId_productoId: {
                    sedeId: e.sedeId,
                    productoId: f.producto.id,
                  },
                },
              })
            ).cantidad,
            5,
          );
          assert.equal(
            await db.movimientoCaja.count({ where: { operacionId: a.id } }),
            1,
          );
          assert.equal(
            await lecturasEquipo(segundo, db).movimientoCaja.count({
              where: { operacionId: a.id },
            }),
            0,
          );
          await assert.rejects(
            () =>
              comprarEquipo(db, segundo, {
                ...e,
                sedeId: f.sedes[1]!.id,
                idempotencia: randomUUID(),
              }),
            /local/,
          );
          await assert.rejects(
            () =>
              comprarEquipo(db, empleado, {
                ...e,
                idempotencia: e.idempotencia,
              }),
            /otros datos/,
          );
          await anularOperacionEquipo(
            db,
            dueno,
            "compra",
            a.id,
            "Compra registrada por error",
          );
          assert.equal(
            (
              await db.existencia.findUniqueOrThrow({
                where: {
                  sedeId_productoId: {
                    sedeId: e.sedeId,
                    productoId: f.producto.id,
                  },
                },
              })
            ).cantidad,
            0,
          );
        },
      );
      await t.test(
        "horarios respetan apertura, turnos futuros y trabajo entre sucursales",
        async () => {
          const p = empleado.identidad.profesionalId!;
          await guardarHorarioEquipo(
            db,
            empleado,
            p,
            f.sedes[0]!.id,
            Array.from({ length: 7 }, (_, diaSemana) => ({
              diaSemana,
              comienza: "09:00",
              termina: "15:00",
            })),
          );
          await assert.rejects(
            () =>
              guardarHorarioEquipo(db, empleado, p, f.sedes[1]!.id, [
                { diaSemana: 1, comienza: "14:00", termina: "18:00" },
              ]),
            /superpone/,
          );
          await assert.rejects(
            () =>
              guardarHorarioEquipo(db, empleado, p, f.sedes[0]!.id, [
                { diaSemana: 1, comienza: "07:00", termina: "20:00" },
              ]),
            /apertura/,
          );
          await assert.rejects(
            () =>
              guardarHorarioEquipo(db, empleado, p, f.sedes[0]!.id, [
                { diaSemana: 1, comienza: "09:00", termina: "10:00" },
              ]),
            /turnos existentes/,
          );
          await assert.rejects(
            () =>
              bloquearAgendaEquipo(db, empleado, {
                profesionalId: p,
                inicio: f.reserva.inicio,
                fin: f.reserva.fin,
                motivo: "Ausente",
              }),
            /turnos existentes/,
          );
          await assert.rejects(
            () =>
              guardarHorarioEquipo(
                db,
                empleado,
                segundo.identidad.profesionalId!,
                f.sedes[0]!.id,
                [{ diaSemana: 1, comienza: "09:00", termina: "18:00" }],
              ),
            /cuenta/,
          );
        },
      );
      await t.test(
        "desactivación mantiene profesional, turnos futuros y membresía sin revocarla",
        async () => {
          assert.equal(
            (
              await eliminarFicha(
                db,
                f.negocio.id,
                "profesional",
                empleado.identidad.profesionalId!,
              )
            ).ok,
            true,
          );
          const p = await db.profesional.findUniqueOrThrow({
            where: { id: empleado.identidad.profesionalId! },
          });
          assert.equal(p.activo, false);
          assert.equal(
            (
              await db.reserva.findUniqueOrThrow({
                where: { id: f.reserva.id },
              })
            ).profesionalId,
            p.id,
          );
          assert.equal(
            (
              await db.membresia.findUniqueOrThrow({
                where: { id: empleado.membresia.id },
              })
            ).activo,
            true,
          );
        },
      );
      await t.test(
        "versiones cambian con cada operación; no hay importes inválidos",
        async () => {
          const antes = (
            await db.negocio.findUniqueOrThrow({ where: { id: f.negocio.id } })
          ).versionEquipo;
          await db.cliente.update({
            where: { id: f.clientes[0]!.id },
            data: { nombre: "Nombre actualizado" },
          });
          assert.ok(
            (
              await db.negocio.findUniqueOrThrow({
                where: { id: f.negocio.id },
              })
            ).versionEquipo > antes,
          );
          for (const monto of ["0", "-1", "1.005", "NaN", "1e3", "1000000001"])
            assert.throws(() => importeEquipo(monto));
        },
      );
    } finally {
      process.env.CUENTAS_EQUIPO_HABILITADAS = flag;
      await f.limpiar();
      await db.$disconnect();
    }
  },
);
