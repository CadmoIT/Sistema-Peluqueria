/** Configura Next.js para consumir los paquetes compartidos del monorepo. */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@turnos/config"],
  async headers() {
    const cabeceras = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
        : []),
    ];

    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
