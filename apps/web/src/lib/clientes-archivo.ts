/** Normaliza columnas y filas de clientes y procesa CSV sin interpretar fórmulas. */
export type CampoCliente =
  "ignorar" | "nombre" | "apellido" | "email" | "telefono";
export type DatosCliente = {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
};
export type FilaCliente = DatosCliente & { fila: number };
export type ErrorFila = { fila: number; mensaje: string };
export const CAMPOS_CLIENTE = [
  "nombre",
  "apellido",
  "email",
  "telefono",
] as const;
export function normalizarBusqueda(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function coincideCliente(cliente: DatosCliente, buscar: string) {
  return normalizarBusqueda(
    CAMPOS_CLIENTE.map((campo) => cliente[campo] ?? "").join(" "),
  ).includes(normalizarBusqueda(buscar));
}
export function detectarCampo(encabezado: string): CampoCliente {
  const valor = normalizarBusqueda(encabezado)
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
  if (["nombre", "nombres", "name", "first name"].includes(valor))
    return "nombre";
  if (["apellido", "apellidos", "last name", "surname"].includes(valor))
    return "apellido";
  if (
    ["email", "e mail", "mail", "correo", "correo electronico"].includes(valor)
  )
    return "email";
  if (
    [
      "telefono",
      "telefonos",
      "celular",
      "phone",
      "whatsapp",
      "numero",
      "numero de telefono",
      "numero telefono",
      "tel",
      "movil",
      "nro de celular",
      "nro celular",
    ].includes(valor)
  )
    return "telefono";
  return "ignorar";
}
export function leerCsv(contenido: string) {
  const texto = contenido.replace(/^\uFEFF/, "");
  const cantidades = new Map([
    [",", 0],
    [";", 0],
    ["\t", 0],
  ]);
  let comillas = false;
  let tieneEncabezado = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (c === '"' && comillas && texto[i + 1] === '"') {
      i++;
      continue;
    }
    if (c === '"') comillas = !comillas;
    if (!comillas && (c === "\r" || c === "\n")) {
      if (tieneEncabezado) break;
      continue;
    }
    if (c.trim()) tieneEncabezado = true;
    if (!comillas && cantidades.has(c))
      cantidades.set(c, cantidades.get(c)! + 1);
  }
  const separador = [...cantidades].sort((a, b) => b[1] - a[1])[0]![0];
  const matriz: string[][] = [];
  let fila: string[] = [],
    celda = "";
  comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i],
      siguiente = texto[i + 1];
    if (c === '"' && comillas && siguiente === '"') {
      celda += '"';
      i++;
    } else if (c === '"') comillas = !comillas;
    else if (c === separador && !comillas) {
      fila.push(celda);
      celda = "";
    } else if ((c === "\r" || c === "\n") && !comillas) {
      if (c === "\r" && siguiente === "\n") i++;
      fila.push(celda);
      matriz.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (comillas)
    throw new Error("El CSV tiene comillas sin cerrar. Revisá el archivo.");
  if (fila.length || celda) {
    fila.push(celda);
    matriz.push(fila);
  }
  return matriz;
}
export function limpiarDato(valor: unknown) {
  const texto =
    typeof valor === "string" || typeof valor === "number"
      ? String(valor).trim()
      : "";
  return texto || null;
}
export function normalizarDatos(
  entrada: Record<string, unknown>,
): DatosCliente {
  return {
    nombre: limpiarDato(entrada.nombre),
    apellido: limpiarDato(entrada.apellido),
    email: limpiarDato(entrada.email)?.toLowerCase() ?? null,
    telefono: limpiarDato(entrada.telefono)?.replace(/[^+\d]/g, "") ?? null,
  };
}
export function errorDatos(datos: DatosCliente) {
  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email))
    return "El email no es válido.";
  if (datos.telefono && datos.telefono.replace(/\D/g, "").length < 6)
    return "El teléfono es demasiado corto.";
  if ((datos.nombre?.length ?? 0) > 200 || (datos.apellido?.length ?? 0) > 200)
    return "El nombre o apellido es demasiado largo.";
  if ((datos.email?.length ?? 0) > 254 || (datos.telefono?.length ?? 0) > 40)
    return "El email o teléfono es demasiado largo.";
  return null;
}
export function validarFilas(entrada: unknown[]) {
  const filas: FilaCliente[] = [],
    errores: ErrorFila[] = [],
    claves = new Set<string>();
  entrada.forEach((valor, indice) => {
    const datos =
      valor && typeof valor === "object"
        ? (valor as Record<string, unknown>)
        : {};
    const fila =
      typeof datos.fila === "number" && Number.isInteger(datos.fila)
        ? datos.fila
        : indice + 2;
    const normalizada = normalizarDatos(datos);
    const error =
      errorDatos(normalizada) ??
      (Object.values(normalizada).some(Boolean) ? null : "La fila está vacía.");
    const contactos = [
      normalizada.email ? `email:${normalizada.email}` : "",
      normalizada.telefono ? `telefono:${normalizada.telefono}` : "",
    ].filter(Boolean);
    if (error || contactos.some((clave) => claves.has(clave))) {
      errores.push({ fila, mensaje: error ?? "Está repetida en el archivo." });
      return;
    }
    contactos.forEach((clave) => claves.add(clave));
    filas.push({ ...normalizada, fila });
  });
  return { filas, errores };
}
export function completarVacios(
  existente: DatosCliente,
  fila: DatosCliente,
): DatosCliente {
  return Object.fromEntries(
    CAMPOS_CLIENTE.map((campo) => [
      campo,
      existente[campo]?.trim() ? existente[campo] : fila[campo],
    ]),
  ) as DatosCliente;
}
export function generarCsv(clientes: DatosCliente[]) {
  const proteger = (valor: string | null) => {
    const texto = valor ?? "";
    const seguro = /^[\s]*[=+\-@]/.test(texto) ? "'" + texto : texto;
    return '"' + seguro.replace(/"/g, '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      ["Nombre", "Apellido", "Email", "Teléfono"],
      ...clientes.map((cliente) =>
        CAMPOS_CLIENTE.map((campo) => cliente[campo]),
      ),
    ]
      .map((fila) => fila.map(proteger).join(";"))
      .join("\r\n")
  );
}
