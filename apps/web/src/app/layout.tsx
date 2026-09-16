/** Define metadatos, fuentes y estilos globales para todas las superficies web. */
import type { Metadata } from "next";
import { Doppio_One, PT_Serif, PT_Serif_Caption } from "next/font/google";
import "./globals.css";
import { CierreDesplegables } from "@/componentes/interaccion/cierre-exterior";

const doppioOne = Doppio_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--fuente-marca",
});
const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--fuente-editorial",
});
const ptSerifCaption = PT_Serif_Caption({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--fuente-preguntas",
});

export const metadata: Metadata = {
  title: { default: "TurnosRapidos", template: "%s · TurnosRapidos" },
  description: "Tu negocio, tus turnos y tus clientes en un solo lugar.",
  icons: {
    icon: { url: "/marca/favicon.svg", type: "image/svg+xml" },
    apple: "/marca/logo-turnos-rapidos.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body
        className={`${doppioOne.variable} ${ptSerif.variable} ${ptSerifCaption.variable}`}
      >
        <CierreDesplegables />
        {children}
      </body>
    </html>
  );
}
