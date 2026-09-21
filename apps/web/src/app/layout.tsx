/** Define metadatos, fuentes y estilos globales para todas las superficies web. */
import type { Metadata } from "next";
import { Doppio_One, Fira_Sans, PT_Serif } from "next/font/google";
import "./globals.css";
import { CierreDesplegables } from "@/componentes/interaccion/cierre-exterior";
import { ProveedorCarga } from "@/componentes/carga/proveedor-carga";
import "@/componentes/carga/carga.css";

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
const firaSans = Fira_Sans({
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--fuente-preguntas",
});

export const metadata: Metadata = {
  title: { default: "TurnosRapidos", template: "%s · TurnosRapidos" },
  description: "Tu negocio, tus turnos y tus clientes en un solo lugar.",
  icons: {
    icon: {
      url: "/marca/favicon.png?v=2",
      type: "image/png",
      sizes: "1120x1120",
    },
    apple: "/marca/logo-turnos-rapidos.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body
        className={`${doppioOne.variable} ${ptSerif.variable} ${firaSans.variable}`}
      >
        <CierreDesplegables />
        <ProveedorCarga>{children}</ProveedorCarga>
      </body>
    </html>
  );
}
