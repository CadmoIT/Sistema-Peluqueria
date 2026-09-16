/** Presenta productos y columnas configurables sin contenedor decorativo. */
import { Plus } from "lucide-react";
import { TablaInventario } from "@/componentes/panel/tabla-inventario";
import { FormularioProducto } from "@/componentes/panel/formulario-producto";
import { resolverColumnas } from "@/lib/columnas-inventario";
import { obtenerInventario } from "@/servicios/panel-datos.service";
export const metadata = { title: "Inventario" };
export default async function PaginaInventario() {
  const { negocio, productos, sedes, libres } = await obtenerInventario();
  const locales = sedes.map(({ id, nombre }) => ({ id, nombre }));
  const columnas = resolverColumnas(negocio.configuracion, libres, locales.length > 1);
  return <div className="panel-contenido"><header className="cabecera-seccion"><h1>Inventario</h1><details className="desplegable-accion"><summary className="boton boton--primario"><Plus />Nuevo producto</summary><FormularioProducto sedes={locales} columnas={columnas} libres={libres} /></details></header>
    <TablaInventario sedes={locales} columnas={columnas} libres={libres} productos={productos.map((p) => ({ ...p, precio: Number(p.precio), costo: Number(p.costo ?? 0) }))} />
  </div>;
}
