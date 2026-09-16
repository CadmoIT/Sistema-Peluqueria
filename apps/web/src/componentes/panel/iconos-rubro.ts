/** Resuelve los iconos de rubro desde una única biblioteca y conserva su estilo común. */
import {
  Briefcase,
  Flower2,
  Hand,
  PawPrint,
  Scissors,
  Sparkles,
  Stethoscope,
  type LucideProps,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";
import type { IconoServicio } from "@/lib/perfiles-negocio";

// Adapta los PNG elegidos por rubro a la misma API visual que los iconos Lucide.
function crearIconoImagen(src: string): LucideIcon {
  return (({ size = 24, className, style }: LucideProps) =>
    createElement("img", {
      src,
      alt: "",
      "aria-hidden": true,
      width: size,
      height: size,
      className,
      style,
    })) as unknown as LucideIcon;
}

const iconoUnas = crearIconoImagen("/iconos/unas.png");
const iconoEntrenamiento = crearIconoImagen("/iconos/entrenamiento.png");
const iconoTatuajes = crearIconoImagen("/iconos/tatuajes.png");
const iconoPsicologia = crearIconoImagen("/iconos/psicologia.png");
const iconoOdontologia = crearIconoImagen("/iconos/odontologia.png");
const iconoNutricion = crearIconoImagen("/iconos/nutricion.png");
const iconoKinesiologia = crearIconoImagen("/iconos/kinesiologia.png");
const iconoOftalmologia = crearIconoImagen("/iconos/oftalmologia.png");
const iconoDepilacion = crearIconoImagen("/iconos/depilacion.png");
const iconoMaquillaje = crearIconoImagen("/iconos/maquillaje.png");

const iconos = {
  Briefcase,
  Dumbbell: iconoEntrenamiento,
  Flower2,
  Hand,
  Paintbrush: iconoUnas,
  PawPrint,
  PenTool: iconoTatuajes,
  Scissors,
  Sparkles,
  Stethoscope,
  Psicologia: iconoPsicologia,
  Odontologia: iconoOdontologia,
  Nutricion: iconoNutricion,
  Kinesiologia: iconoKinesiologia,
  Oftalmologia: iconoOftalmologia,
  Depilacion: iconoDepilacion,
  Maquillaje: iconoMaquillaje,
} satisfies Record<IconoServicio, LucideIcon>;

export function obtenerIconoServicios(icono: IconoServicio): LucideIcon {
  return iconos[icono];
}
