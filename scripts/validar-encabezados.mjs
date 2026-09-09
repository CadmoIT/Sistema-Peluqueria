/** Valida que los archivos de codigo creados manualmente expliquen su proposito al inicio. */
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const raices = ["apps", "packages", "scripts"];
const extensiones = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".sql",
  ".yml",
  ".yaml",
]);
const ignorados = new Set(["next-env.d.ts"]);
const errores = [];

async function recorrer(directorio) {
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      if (!["node_modules", ".next", "dist"].includes(entrada.name))
        await recorrer(ruta);
      continue;
    }
    if (!extensiones.has(extname(ruta)) || ignorados.has(entrada.name))
      continue;
    const contenido = await readFile(ruta, "utf8");
    const inicio = contenido.trimStart();
    if (
      !inicio.startsWith("/**") &&
      !inicio.startsWith("/*") &&
      !inicio.startsWith("//") &&
      !inicio.startsWith("#") &&
      !inicio.startsWith("--")
    ) {
      errores.push(ruta);
    }
  }
}

for (const raiz of raices) await recorrer(raiz);
if (errores.length) {
  console.error(`Falta encabezado descriptivo en:\n${errores.join("\n")}`);
  process.exit(1);
}
console.log("Encabezados descriptivos verificados.");
