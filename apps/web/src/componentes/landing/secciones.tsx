/** Presenta beneficios y pasos de adopción con una identidad clara y cercana. */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Globe2,
  MessageCircleMore,
  UsersRound,
} from "lucide-react";
import { GiLipstick } from "react-icons/gi";
import { MdSpa } from "react-icons/md";
import type { IconType } from "react-icons";
import { TbDumbbell, TbMassage, TbPaw, TbStethoscope } from "react-icons/tb";

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
    imagen: "/rubros/unas.jpg",
    ajusteImagen: "rubros__imagen--unas",
  },
  { nombre: "Estética", icono: GiLipstick },
  { nombre: "Spa", icono: MdSpa },
  { nombre: "Masajes", icono: TbMassage },
  { nombre: "Tatuajes", imagen: "/rubros/tatuajes.png" },
  { nombre: "Consultorios", icono: TbStethoscope },
  { nombre: "Veterinarias", icono: TbPaw },
  { nombre: "Entrenamiento", icono: TbDumbbell },
];

function GrupoRubros({ repetido = false }: { repetido?: boolean }) {
  return (
    <div className="rubros__grupo" aria-hidden={repetido || undefined}>
      {rubros.map(({ nombre, icono: Icono, imagen, ajusteImagen }) => (
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
    icono: CalendarCheck2,
    titulo: "Una agenda que respeta tus tiempos",
    texto:
      "Horarios, descansos y profesionales organizados sin superposiciones.",
  },
  {
    icono: Globe2,
    titulo: "Tu negocio abierto las 24 horas",
    texto: "Una página propia para que tus clientes reserven cuando quieran.",
  },
  {
    icono: MessageCircleMore,
    titulo: "Menos mensajes repetidos",
    texto: "Confirmaciones y recordatorios que mantienen a todos al día.",
  },
  {
    icono: CreditCard,
    titulo: "Cobros simples y seguros",
    texto: "Recibí señas y ventas directamente mediante Mercado Pago.",
  },
  {
    icono: UsersRound,
    titulo: "Cada cliente, más cerca",
    texto: "Historial, preferencias y visitas para brindar una mejor atención.",
  },
  {
    icono: ChartNoAxesCombined,
    titulo: "Números que se entienden",
    texto: "Ocupación, ventas y servicios destacados en una vista sencilla.",
  },
];

export function SeccionesLanding() {
  return (
    <>
      <section className="rubros" aria-label="Rubros compatibles">
        <div className="rubros__marquesina">
          <div className="rubros__pista">
            <GrupoRubros />
            <GrupoRubros repetido />
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
          {beneficios.map(({ icono: Icono, titulo, texto }) => (
            <article className="beneficio" key={titulo}>
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
            <li>
              <b>1</b>
              <div>
                <h3>Contanos sobre tu negocio</h3>
                <p>Completá tus datos y creá una contraseña segura.</p>
              </div>
            </li>
            <li>
              <b>2</b>
              <div>
                <h3>Personalizá tu espacio</h3>
                <p>Sumá servicios, equipo, horarios, fotos y colores.</p>
              </div>
            </li>
            <li>
              <b>3</b>
              <div>
                <h3>Compartí tu enlace</h3>
                <p>Probalo durante siete días y recibí tus primeros turnos.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="cierre-landing">
        <div className="contenedor cierre-landing__interior">
          <div>
            <span>Tu negocio, a tu ritmo</span>
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
