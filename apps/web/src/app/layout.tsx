/** Define metadatos, fuentes y estilos globales para todas las superficies web. */
import type { Metadata } from "next";
import { Doppio_One, PT_Serif } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: { default: "TurnosRapidos", template: "%s · TurnosRapidos" },
  description: "Tu negocio, tus turnos y tus clientes en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${doppioOne.variable} ${ptSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
