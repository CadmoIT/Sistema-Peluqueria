/** Permite elegir un contexto explícito sin crear negocios para los empleados. */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { autenticacion } from "@/lib/autenticacion";
import { prisma } from "@/lib/prisma";
import { seleccionarNegocio } from "./acciones";
export default async function SeleccionarNegocio() {
  const s = await autenticacion.api.getSession({ headers: await headers() });
  if (!s) redirect("/acceder");
  const todas = await prisma.membresia.findMany({
    where: { usuarioId: s.user.id, activo: true },
    include: {
      negocio: { select: { id: true, nombre: true } },
      profesional: true,
    },
  });
  const membresias = todas.filter(
    (m) =>
      m.rol !== "PROFESIONAL" ||
      Boolean(s.user.emailVerified && m.aceptadaEn && m.profesional?.activo),
  );
  if (!todas.length) {
    const anteriores = await prisma.membresia.count({
      where: { usuarioId: s.user.id },
    });
    if (!anteriores) redirect("/primeros-pasos");
  }
  return (
    <main style={{ maxWidth: 600, margin: "60px auto", padding: 24 }}>
      <h1>Elegí tu espacio de trabajo</h1>
      <p>
        Tu cuenta es personal. Cada negocio conserva sus propios datos y
        permisos.
      </p>
      {membresias.map((m) => (
        <form
          action={seleccionarNegocio}
          key={m.id}
          style={{
            marginTop: 20,
            padding: 20,
            border: "1px solid #d7e7ec",
            borderRadius: 16,
          }}
        >
          <input type="hidden" name="negocioId" value={m.negocioId} />
          <h2>{m.negocio.nombre}</h2>
          <p>
            {m.rol === "DUENO"
              ? "Dueño"
              : m.rol === "ADMINISTRADOR"
                ? "Administrador"
                : "Empleado"}
          </p>
          <button className="boton" type="submit">
            Entrar al negocio
          </button>
        </form>
      ))}
      {!membresias.length && (
        <p>
          Tu acceso al negocio ya no está disponible. Contactá al dueño para
          recibir una nueva invitación.
        </p>
      )}
      <Link href="/acceder">Volver al acceso</Link>
    </main>
  );
}
