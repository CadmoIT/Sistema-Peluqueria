/** Prueba permisos y reservas de nombres únicamente en PostgreSQL local aislado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  asignarSubdominio,
  cambiarSubdominio,
} from "./subdominio-negocio.service";
import { claveNombreNegocio } from "@/lib/subdominio-negocio";

test(
  "homónimos, permisos, aliases y colisiones reales de PostgreSQL",
  { skip: process.env.PRUEBAS_SUBDOMINIOS !== "1" },
  async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
    assert.match(
      url.searchParams.get("schema") ?? "",
      /^subdominio_prueba_[a-z0-9_]+$/,
    );
    assert.notEqual(process.env.NODE_ENV, "production");
    const db = new PrismaClient();
    const marca = `prueba${randomUUID().replace(/-/g, "")}`;
    const nombre = `Clínica ${marca}`;
    const ids: string[] = [];
    try {
      for (let indice = 0; indice < 2; indice++) {
        const negocio = await db.$transaction(
          async (tx) => {
            const subdominio = await asignarSubdominio(tx, nombre);
            return tx.negocio.create({
              data: {
                nombre,
                nombreClave: claveNombreNegocio(nombre),
                slug: `${marca}-${indice}`,
                subdominio,
                suscripcion: {
                  create: {
                    plan: "PRUEBA",
                    precioMensual: 0,
                    pruebaFinalizaEn: new Date(Date.now() + 86_400_000),
                  },
                },
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        ids.push(negocio.id);
        assert.equal(
          negocio.subdominio,
          claveNombreNegocio(nombre) + (indice ? "-2" : ""),
        );
      }
      const primero = await db.negocio.findUniqueOrThrow({
        where: { id: ids[0] },
      });
      assert.equal(
        (
          await cambiarSubdominio(
            db,
            primero.id,
            "PROFESIONAL",
            `${marca}-nuevo`,
          )
        ).ok,
        false,
      );
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", "www")).ok,
        false,
      );
      const segundo = await db.negocio.findUniqueOrThrow({
        where: { id: ids[1] },
      });
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", segundo.subdominio!))
          .ok,
        false,
      );
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", segundo.slug)).ok,
        false,
      );
      await db.sede.create({
        data: {
          negocioId: segundo.id,
          nombre: "Sede",
          subdominio: `${marca}-local`,
          direccion: "",
        },
      });
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", `${marca}-local`)).ok,
        false,
      );
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", `${marca}-nuevo`)).ok,
        true,
      );
      assert.equal(
        (
          await db.subdominioAnterior.findUniqueOrThrow({
            where: { nombre: primero.subdominio! },
          })
        ).negocioId,
        primero.id,
      );
      assert.equal(
        (await cambiarSubdominio(db, segundo.id, "ADMIN", primero.subdominio!))
          .ok,
        false,
      );
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", primero.subdominio!))
          .ok,
        true,
      );
      await db.negocio.update({
        where: { id: segundo.id },
        data: { nombre: "Nombre diferente", nombreClave: "nombrediferente" },
      });
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", `${marca}-otro`)).ok,
        false,
      );
      await db.negocio.update({
        where: { id: segundo.id },
        data: { nombre, nombreClave: claveNombreNegocio(nombre) },
      });
      await db.suscripcion.update({
        where: { negocioId: primero.id },
        data: { pruebaFinalizaEn: new Date(Date.now() - 1000) },
      });
      assert.equal(
        (await cambiarSubdominio(db, primero.id, "DUENO", `${marca}-otro`)).ok,
        false,
      );
      await db.suscripcion.update({
        where: { negocioId: primero.id },
        data: { pruebaFinalizaEn: new Date(Date.now() + 86_400_000) },
      });
      const carreras = await Promise.all(
        ids.map((id) =>
          cambiarSubdominio(db, id, "DUENO", `${marca}-competido`),
        ),
      );
      assert.equal(carreras.filter((resultado) => resultado.ok).length, 1);
      assert.equal(
        await db.negocio.count({ where: { subdominio: `${marca}-competido` } }),
        1,
      );
    } finally {
      await db.negocio.deleteMany({
        where: { id: { in: ids }, slug: { startsWith: marca } },
      });
      await db.$disconnect();
    }
  },
);
