/** Consulta en PostgreSQL la versión pública y publicada de cada negocio. */
import { Injectable } from "@nestjs/common";
import { tieneAccesoOperativo } from "@turnos/config";
import type { NegocioPublico } from "@turnos/contratos";
import type { NegociosRepository } from "../contracts/negocios.repository";
import { PrismaService } from "../../services/prisma.service";

@Injectable()
export class NegociosPrismaRepository implements NegociosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorSlug(slug: string): Promise<NegocioPublico | null> {
    const negocio = await this.prisma.negocio.findFirst({
      where: { slug, publicado: true },
      include: {
        suscripcion: true,
        sedes: { where: { activa: true } },
        servicios: { where: { activo: true }, include: { categoria: true } },
        profesionales: { where: { activo: true } },
      },
    });
    if (!negocio || negocio.sitioRetiradoEn || !tieneAccesoOperativo(negocio.suscripcion)) return null;
    const sede = negocio.sedes[0];
    return {
      id: negocio.id,
      slug: negocio.slug,
      nombre: negocio.nombre,
      descripcion: negocio.descripcion ?? "",
      direccion: sede?.direccion ?? "",
      telefono: negocio.telefono ?? sede?.telefono ?? "",
      calificacion: sede?.googlePuntaje ? Number(sede.googlePuntaje) : 0,
      resenas: sede?.googleResenas ?? 0,
      sedes: negocio.sedes.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        direccion: item.direccion,
        telefono: item.telefono ?? "",
      })),
      servicios: negocio.servicios.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        categoria: item.categoria?.nombre ?? "General",
        descripcion: item.descripcion ?? "",
        duracionMinutos: item.duracionMinutos,
        precio: Number(item.precio),
        imagen: item.imagen ?? undefined,
      })),
      profesionales: negocio.profesionales.map((item) => ({
        id: item.id,
        nombre: `${item.nombre} ${item.apellido ?? ""}`.trim(),
        especialidad: item.especialidad ?? "",
        iniciales:
          `${item.nombre[0] ?? ""}${item.apellido?.[0] ?? ""}`.toUpperCase(),
      })),
    };
  }
}
