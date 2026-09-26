/** Presenta beneficios y pasos de adopción con una identidad clara y cercana. */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, SquareMenu } from "lucide-react";
import { BiMessageRoundedDots } from "react-icons/bi";
import { BsCreditCard2Front } from "react-icons/bs";
import { FaChartLine } from "react-icons/fa6";
import { FiGlobe } from "react-icons/fi";
import { GiLipstick } from "react-icons/gi";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { MdEventNote, MdSpa } from "react-icons/md";
import type { IconType } from "react-icons";
import {
  TbMassage,
  TbPalette,
  TbPaw,
  TbStethoscope,
  TbWorldShare,
} from "react-icons/tb";

type Rubro = {
  nombre: string;
  icono?: IconType;
  imagen?: string;
  ajusteImagen?: string;
};

const rubros: Rubro[] = [
  { nombre: "Peluquerías", imagen: "/rubros/peluqueria.svg" },
  { nombre: "Barberías", imagen: "/rubros/barberia.avif" },
  {
    nombre: "Uñas",
    imagen: "/iconos/unas.png",
  },
  { nombre: "Estética", icono: GiLipstick },
  { nombre: "Spa", icono: MdSpa },
  { nombre: "Masajes", icono: TbMassage },
  { nombre: "Tatuajes", imagen: "/iconos/tatuajes.png" },
  { nombre: "Consultorios", icono: TbStethoscope },
  { nombre: "Veterinarias", icono: TbPaw },
  { nombre: "Entrenamiento", imagen: "/iconos/entrenamiento.png" },
  { nombre: "Psicología", imagen: "/iconos/psicologia.png" },
  { nombre: "Odontología", imagen: "/iconos/odontologia.png" },
  { nombre: "Nutrición", imagen: "/iconos/nutricion.png" },
  { nombre: "Kinesiología", imagen: "/iconos/kinesiologia.png" },
  { nombre: "Oftalmología", imagen: "/iconos/oftalmologia.png" },
  { nombre: "Depilación", imagen: "/iconos/depilacion.png" },
  { nombre: "Maquillaje", imagen: "/iconos/maquillaje.png" },
];

// Distribuye los rubros en dos pistas mixtas para una marquesina continua.
const seleccionarRubro = (indice: number) => rubros[indice]!;
const rubrosArriba = [
  seleccionarRubro(0),
  seleccionarRubro(10),
  seleccionarRubro(2),
  seleccionarRubro(13),
  seleccionarRubro(6),
  seleccionarRubro(4),
  seleccionarRubro(11),
  seleccionarRubro(9),
  seleccionarRubro(16),
];
const rubrosAbajo = [
  seleccionarRubro(1),
  seleccionarRubro(12),
  seleccionarRubro(3),
  seleccionarRubro(7),
  seleccionarRubro(8),
  seleccionarRubro(5),
  seleccionarRubro(14),
  seleccionarRubro(15),
];

function GrupoRubros({
  lista,
  repetido = false,
}: {
  lista: Rubro[];
  repetido?: boolean;
}) {
  return (
    <div className="rubros__grupo" aria-hidden={repetido || undefined}>
      {lista.map(({ nombre, icono: Icono, imagen, ajusteImagen }) => (
        <span className="rubros__item" key={nombre}>
          {imagen ? (
            <span className="rubros__imagen-contenedor" aria-hidden="true">
              <Image
                className={`rubros__imagen ${ajusteImagen ?? ""}`}
                src={imagen}
                alt=""
                width={44}
                height={44}
                unoptimized
              />
            </span>
          ) : (
            Icono && <Icono className="rubros__icono" aria-hidden="true" />
          )}
          <strong>{nombre}</strong>
        </span>
      ))}
    </div>
  );
}

const beneficios = [
  {
    icono: MdEventNote,
    titulo: "Una agenda personalizada",
    texto: "Fechas, horarios y profesionales organizados en una misma agenda.",
  },
  {
    icono: FiGlobe,
    titulo: "Tu negocio abierto las 24 horas",
    texto: "Una página para que tus clientes reserven en cualquier momento.",
  },
  {
    icono: BiMessageRoundedDots,
    titulo: "Mensajes automáticos",
    texto:
      "Confirmaciones y recordatorios automáticos para no perder ningún turno.",
  },
  {
    icono: BsCreditCard2Front,
    titulo: "Cobros simples y seguros",
    texto: "Recibí reservas y ventas mediante Mercado Pago o en efectivo.",
  },
  {
    icono: HiOutlineUserGroup,
    titulo: "Información de tus clientes",
    texto: "Consultá el historial de cada cliente y todos sus turnos.",
  },
  {
    icono: FaChartLine,
    titulo: "Cuentas claras",
    texto:
      "Ventas, compras, servicios y ofertas organizados de manera sencilla.",
  },
];

const pasos = [
  {
    numero: "1",
    icono: SquareMenu,
    titulo: "Completá los datos de tu negocio",
    texto: "Cargá la información, los horarios y el equipo de tu negocio.",
  },
  {
    numero: "2",
    icono: TbPalette,
    titulo: "Personalizá tu página web",
    texto: "Elegí tus colores, imágenes y el estilo que mejor te representa.",
  },
  {
    numero: "3",
    icono: TbWorldShare,
    titulo: "Compartila con tus clientes",
    texto: "Enviá tu enlace y empezá a recibir reservas online.",
  },
];

export function SeccionesLanding() {
  return (
    <>
      <section className="rubros" aria-label="Rubros compatibles">
        <div className="rubros__marquesina rubros__marquesina--arriba">
          <div className="rubros__pista">
            <GrupoRubros lista={rubrosArriba} />
            <GrupoRubros lista={rubrosArriba} repetido />
          </div>
        </div>
        <div className="rubros__marquesina rubros__marquesina--abajo">
          <div className="rubros__pista">
            <GrupoRubros lista={rubrosAbajo} />
            <GrupoRubros lista={rubrosAbajo} repetido />
          </div>
        </div>
      </section>

      <section className="landing-seccion contenedor" id="beneficios">
        <div className="landing-titulo">
          <span>Todo en un mismo lugar</span>
          <h2>
            Más tiempo para atender.
            <br />
            Menos tiempo para organizar.
          </h2>
          <p>
            Turnos Rápidos reúne las herramientas de todos los días en una
            experiencia amable para vos, tu equipo y tus clientes.
          </p>
        </div>

        <div className="beneficios-grid">
          {beneficios.map(({ icono: Icono, titulo, texto }, indice) => (
            <article
              className={`beneficio beneficio--${indice + 1}`}
              key={titulo}
            >
              <span className="beneficio__icono">
                <Icono aria-hidden="true" />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="como-funciona" id="como-funciona">
        <div className="contenedor como-funciona__interior">
          <div className="landing-titulo landing-titulo--izquierda">
            <span>Simple desde el comienzo</span>
            <h2>Tu agenda online en tres momentos.</h2>
          </div>

          <ol className="pasos-nuevos">
            {pasos.map(({ numero, icono: Icono, titulo, texto }) => (
              <li key={numero}>
                <span className="pasos-nuevos__numero" aria-hidden="true">
                  {numero}
                </span>
                <span className="pasos-nuevos__icono">
                  <Icono aria-hidden="true" />
                </span>
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cierre-landing">
        <div className="contenedor cierre-landing__interior">
          <div>
            <h2>
              Empezá hoy.
              <br />
              Nosotros te acompañamos.
            </h2>
          </div>
          <div>
            <p>Conocé las herramientas y armá tu espacio a tu manera.</p>
            <Link href="/acceder" className="boton boton--claro boton--grande">
              Crear mi espacio <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
