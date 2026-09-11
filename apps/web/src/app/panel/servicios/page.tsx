/** Gestiona el catálogo de servicios que también alimenta el micrositio público. */
import { Clock3, Edit3, Eye, EyeOff, Plus, Scissors } from "lucide-react";
import {
  actualizarServicio,
  alternarServicio,
  crearServicio,
} from "./acciones";
import { CampoImagen } from "@/componentes/panel/campo-imagen";
import { obtenerCatalogo } from "@/servicios/panel-datos.service";

export const metadata = { title: "Servicios" };

export default async function PaginaServicios() {
  const { servicios, profesionales, sedes } = await obtenerCatalogo();
  return (
    <div className="panel-contenido">
      <header className="cabecera-seccion">
        <div>
          <h1>Servicios</h1>
          <p>
            Definí qué ofrecés; los cambios activos aparecen automáticamente en
            tu sitio.
          </p>
        </div>
        <details className="desplegable-accion">
          <summary className="boton boton--primario">
            <Plus /> Nuevo servicio
          </summary>
          <FormularioServicio profesionales={profesionales} sedes={sedes} />
        </details>
      </header>
      {servicios.length ? (
        <div className="grilla-listado">
          {servicios.map((servicio) => (
            <article
              className={`tarjeta-listado ${servicio.activo ? "" : "inactivo"}`}
              key={servicio.id}
            >
              <div className="avatar-cuadrado">
                <Scissors />
              </div>
              <div className="tarjeta-listado__contenido">
                <small>{servicio.categoria?.nombre ?? "General"}</small>
                <h2>{servicio.nombre}</h2>
                <p>{servicio.descripcion || "Sin descripción"}</p>
                <div>
                  <span>
                    <Clock3 /> {servicio.duracionMinutos} min
                  </span>
                  <strong>{pesos(Number(servicio.precio))}</strong>
                </div>
              </div>
              <div className="tarjeta-listado__acciones">
                <details className="desplegable-accion">
                  <summary className="boton boton--secundario">
                    <Edit3 /> Editar
                  </summary>
                  <FormularioServicio
                    profesionales={profesionales}
                    sedes={sedes}
                    servicio={servicio}
                  />
                </details>
                <form action={alternarServicio}>
                  <input type="hidden" name="id" value={servicio.id} />
                  <button className="boton boton--secundario">
                    {servicio.activo ? (
                      <>
                        <EyeOff /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye /> Publicar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="estado-vacio grande">
          <Scissors />
          <strong>Cargá tu primer servicio</strong>
          <p>Necesitás al menos uno para que tus clientes puedan reservar.</p>
        </div>
      )}
    </div>
  );
}
type Opcion = { id: string; nombre: string; apellido?: string | null };
type ServicioEditable = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  precio: { toString(): string };
  duracionMinutos: number;
  bufferMinutos: number;
  porcentajeSena: { toString(): string } | null;
  categoria: { nombre: string } | null;
  profesionales: Array<{ profesionalId: string }>;
  sedes: Array<{ sedeId: string }>;
};

function FormularioServicio({
  profesionales,
  sedes,
  servicio,
}: {
  profesionales: Opcion[];
  sedes: Opcion[];
  servicio?: ServicioEditable;
}) {
  const accion = servicio ? actualizarServicio : crearServicio;
  return (
    <form action={accion} className="formulario-flotante">
      <h2>{servicio ? "Editar servicio" : "Nuevo servicio"}</h2>
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      <label>
        Nombre
        <input
          name="nombre"
          required
          minLength={2}
          defaultValue={servicio?.nombre}
        />
      </label>
      <label>
        Categoría
        <input
          name="categoria"
          placeholder="Por ejemplo, Cabello"
          defaultValue={servicio?.categoria?.nombre}
        />
      </label>
      <label>
        Descripción
        <textarea
          name="descripcion"
          rows={3}
          defaultValue={servicio?.descripcion ?? ""}
        />
      </label>
      <CampoImagen
        name="imagen"
        etiqueta="Imagen"
        tipo="servicio"
        valorInicial={servicio?.imagen ?? ""}
      />
      <div className="form-grid">
        <label>
          Precio
          <input
            name="precio"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={servicio?.precio.toString()}
          />
        </label>
        <label>
          Duración
          <input
            name="duracionMinutos"
            type="number"
            min="5"
            step="5"
            defaultValue={servicio?.duracionMinutos ?? 30}
            required
          />
        </label>
        <label>
          Pausa posterior
          <input
            name="bufferMinutos"
            type="number"
            min="0"
            step="5"
            defaultValue={servicio?.bufferMinutos ?? 0}
          />
        </label>
        <label>
          Seña (%)
          <input
            name="porcentajeSena"
            type="number"
            min="0"
            max="100"
            defaultValue={servicio?.porcentajeSena?.toString() ?? "0"}
          />
        </label>
      </div>
      <fieldset className="selector-multiple">
        <legend>Profesionales que lo realizan</legend>
        {profesionales.map((profesional) => (
          <label key={profesional.id}>
            <input
              type="checkbox"
              name="profesionalIds"
              value={profesional.id}
              defaultChecked={
                !servicio ||
                servicio.profesionales.some(
                  (asignacion) => asignacion.profesionalId === profesional.id,
                )
              }
            />
            {profesional.nombre} {profesional.apellido}
          </label>
        ))}
      </fieldset>
      <fieldset className="selector-multiple">
        <legend>Sedes donde se ofrece</legend>
        {sedes.map((sede) => (
          <label key={sede.id}>
            <input
              type="checkbox"
              name="sedeIds"
              value={sede.id}
              defaultChecked={
                !servicio ||
                servicio.sedes.some(
                  (asignacion) => asignacion.sedeId === sede.id,
                )
              }
            />
            {sede.nombre}
          </label>
        ))}
      </fieldset>
      <button className="boton boton--primario">
        {servicio ? "Guardar cambios" : "Guardar servicio"}
      </button>
    </form>
  );
}
function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}
