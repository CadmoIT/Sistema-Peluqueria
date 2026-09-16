/** Prueba transacciones sólo en PostgreSQL local y en negocios efímeros, nunca en cuentas reales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { eliminarFicha } from "./eliminacion-fichas.service";
import { ajustarExistencia, guardarValoresLibres } from "./inventario-operaciones.service";
import { vender } from "./ventas-operaciones.service";
const habilitadas = process.env.PRUEBAS_BASE_DATOS === "1" && process.env.NODE_ENV !== "production";
test("transacciones de fichas, stock, columnas y atribución", { skip: !habilitadas }, async (t) => {
  process.loadEnvFile(".env.local");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname), "Sólo se admiten bases locales.");
  const db = new PrismaClient(), negocio = await db.negocio.create({ data: { nombre: "Prueba efímera", slug: `prueba-panel-${randomUUID()}` } });
  try {
    const sede = await db.sede.create({ data: { negocioId: negocio.id, nombre: "Local de prueba", direccion: "Dirección ficticia" } });
    const profesional = await db.profesional.create({ data: { negocioId: negocio.id, nombre: "Profesional ficticio" } });
    const cliente = await db.cliente.create({ data: { negocioId: negocio.id, nombre: "Cliente ficticio", email: "prueba@ejemplo.com" } });
    const pasado = await db.reserva.create({ data: { negocioId: negocio.id, sedeId: sede.id, profesionalId: profesional.id, clienteId: cliente.id, codigo: "PASADO", inicio: new Date("2020-01-01T12:00Z"), fin: new Date("2020-01-01T13:00Z"), total: 1200, sena: 100, estado: "COMPLETADA" } });
    const futuro = await db.reserva.create({ data: { negocioId: negocio.id, sedeId: sede.id, profesionalId: profesional.id, clienteId: cliente.id, codigo: "FUTURO", inicio: new Date("2040-01-01T12:00Z"), fin: new Date("2040-01-01T13:00Z"), total: 3000, sena: 0, estado: "CONFIRMADA" } });
    await t.test("bloquea fichas con turnos activos y rechaza identificadores ajenos", async () => {
      assert.equal((await eliminarFicha(db, negocio.id, "cliente", cliente.id)).codigo, "TURNOS_ACTIVOS");
      assert.equal((await eliminarFicha(db, negocio.id, "profesional", profesional.id)).codigo, "TURNOS_ACTIVOS");
      assert.equal((await eliminarFicha(db, "negocio-ajeno", "cliente", cliente.id)).ok, false);
    });
    await db.reserva.update({ where: { id: futuro.id }, data: { estado: "CANCELADA" } });
    const aviso = await db.avisoReserva.create({ data: { negocioId: negocio.id, reservaId: futuro.id, canal: "EMAIL", tipo: "CONFIRMACION", inicioTurno: futuro.inicio, programadoPara: new Date() } });
    await t.test("borra el cliente, detiene avisos y conserva historial sin ficha oculta", async () => {
      assert.equal((await eliminarFicha(db, negocio.id, "cliente", cliente.id)).ok, true);
      assert.equal(await db.cliente.findUnique({ where: { id: cliente.id } }), null);
      const turno = await db.reserva.findUniqueOrThrow({ where: { id: pasado.id } }); assert.equal(turno.clienteId, null); assert.equal(Number(turno.total), 1200);
      assert.equal((await db.avisoReserva.findUniqueOrThrow({ where: { id: aviso.id } })).estado, "OMITIDO");
      const nuevo = await db.cliente.create({ data: { negocioId: negocio.id, email: cliente.email } }); assert.notEqual(nuevo.id, cliente.id);
    });
    const producto = await db.producto.create({ data: { negocioId: negocio.id, nombre: "Producto ficticio", precio: 500, costo: 200, sku: "SKU-ORIGINAL", existencias: { create: { negocioId: negocio.id, sedeId: sede.id, cantidad: 20 } } } });
    await t.test("ajustes concurrentes no pierden unidades ni permiten negativos", async () => {
      await Promise.all(Array.from({ length: 8 }, () => ajustarExistencia(db, negocio.id, producto.id, sede.id, 1, "Prueba")));
      assert.equal((await db.existencia.findUniqueOrThrow({ where: { sedeId_productoId: { sedeId: sede.id, productoId: producto.id } } })).cantidad, 28);
      await assert.rejects(() => ajustarExistencia(db, negocio.id, producto.id, sede.id, -29, "Prueba"), /negativo/);
    });
    const idempotencia = randomUUID(), solicitud = { sedeId: sede.id, atribucion: profesional.id, idempotencia, items: [{ id: producto.id, tipo: "producto", cantidad: 3 }] };
    let ventaId = "";
    await t.test("la misma confirmación concurrente registra una venta, un ingreso y un descuento", async () => {
      const ventas = await Promise.all([vender(db, negocio.id, solicitud), vender(db, negocio.id, solicitud)]);
      assert.equal(ventas[0]!.id, ventas[1]!.id); ventaId = ventas[0]!.id;
      assert.equal(ventas[0]!.origen, "EQUIPO"); assert.equal(ventas[0]!.profesionalId, profesional.id);
      assert.equal(await db.movimientoCaja.count({ where: { negocioId: negocio.id } }), 1);
      assert.equal((await db.existencia.findUniqueOrThrow({ where: { sedeId_productoId: { sedeId: sede.id, productoId: producto.id } } })).cantidad, 25);
      await assert.rejects(() => vender(db, negocio.id, { ...solicitud, items: [{ id: producto.id, tipo: "producto", cantidad: 4 }] }), /otro carrito/);
      await assert.rejects(() => vender(db, negocio.id, { ...solicitud, idempotencia: randomUUID(), atribucion: "" }), /atribuir/);
      await assert.rejects(() => vender(db, negocio.id, { ...solicitud, idempotencia: randomUUID(), items: [{ id: producto.id, tipo: "producto", cantidad: 26 }] }), /suficiente/);
      assert.equal(await db.venta.count({ where: { negocioId: negocio.id } }), 1);
    });
    await t.test("columnas libres se vacían o borran sin afectar SKU, costo ni cantidad", async () => {
      const columna = await db.columnaInventario.create({ data: { negocioId: negocio.id, nombre: "Vencimiento", tipo: "FECHA" } }), datos = new FormData();
      datos.set(`columna:${columna.id}`, "2028-12-31");
      await db.$transaction((tx) => guardarValoresLibres(tx, negocio.id, producto.id, datos));
      await db.$transaction((tx) => guardarValoresLibres(tx, negocio.id, producto.id, new FormData()));
      assert.equal(await db.valorColumnaInventario.count({ where: { productoId: producto.id } }), 1);
      assert.equal((await db.producto.findUniqueOrThrow({ where: { id: producto.id } })).sku, "SKU-ORIGINAL");
      await db.columnaInventario.delete({ where: { id: columna.id } });
      assert.equal(await db.valorColumnaInventario.count({ where: { productoId: producto.id } }), 0);
    });
    await t.test("el profesional eliminado deja importes y atribución histórica neutros", async () => {
      await db.comision.create({ data: { negocioId: negocio.id, profesionalId: profesional.id, referenciaId: ventaId, porcentaje: 10, monto: 150 } });
      await db.conexionGoogleCalendar.create({ data: { negocioId: negocio.id, profesionalId: profesional.id, nombre: "Conexión exclusiva simulada" } });
      assert.equal((await eliminarFicha(db, negocio.id, "profesional", profesional.id)).ok, true);
      assert.equal((await db.reserva.findUniqueOrThrow({ where: { id: pasado.id } })).profesionalId, null);
      const venta = await db.venta.findUniqueOrThrow({ where: { id: ventaId } }); assert.equal(venta.profesionalId, null); assert.equal(Number(venta.total), 1500); assert.equal(venta.origen, "EQUIPO");
      assert.equal(await db.conexionGoogleCalendar.count({ where: { negocioId: negocio.id } }), 0);
      assert.equal(Number((await db.comision.findFirstOrThrow({ where: { negocioId: negocio.id } })).monto), 150);
    });
    await t.test("baja de producto registra ajuste final y conserva concepto y stock histórico", async () => {
      assert.equal((await eliminarFicha(db, negocio.id, "producto", producto.id)).ok, true);
      assert.equal(await db.producto.findUnique({ where: { id: producto.id } }), null);
      const item = await db.ventaItem.findFirstOrThrow({ where: { ventaId } }); assert.equal(item.productoId, null); assert.equal(item.concepto, "Producto ficticio");
      const final = await db.movimientoStock.findFirstOrThrow({ where: { negocioId: negocio.id, referencia: `Baja definitiva del producto:${producto.id}` } }); assert.equal(final.cantidad, -25); assert.equal(final.productoId, null);
      assert.equal(Number((await db.movimientoCaja.findFirstOrThrow({ where: { negocioId: negocio.id } })).monto), 1500);
    });
  } finally {
    await db.comision.deleteMany({ where: { negocioId: negocio.id } });
    await db.negocio.delete({ where: { id: negocio.id } });
    await db.$disconnect();
  }
});
