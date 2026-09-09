/** Lee y normaliza las variables necesarias para iniciar la API. */
export type ConfiguracionApi = {
  puerto: number;
  webUrl: string;
};

// Lee las variables de entorno y devuelve un objeto con la configuración de la API.
export function cargarConfiguracionApi(): ConfiguracionApi {
  return {
    puerto: Number(process.env.PORT ?? 3001),
    webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  };
}
