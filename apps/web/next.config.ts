/** Configura Next.js para consumir los paquetes compartidos del monorepo. */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@turnos/config"],
};

export default nextConfig;
