<!-- Explica las decisiones de arquitectura y los limites iniciales del sistema. -->

# Arquitectura de TurnosRapidos

TurnosRapidos usa un monolito modular para mantener transacciones simples sin cerrar el camino al escalado horizontal. `web` contiene las experiencias visuales, `api` concentra reglas de negocio y autorizacion, y `worker` procesa notificaciones y tareas diferidas.

Cada registro empresarial lleva `negocioId`. El servidor obtiene ese contexto desde la sesion o el hostname y nunca confia en un identificador enviado libremente por el cliente. La separacion se comprueba con pruebas automatizadas.

## Dominios durante la prueba

En desarrollo no hace falta comprar un dominio:

- Landing: `http://localhost:3000`
- Panel: `http://localhost:3000/panel`
- Sitio público local: `http://localhost:3000/sitio/{slug}`
- API: `http://localhost:3001/api/v1`

El middleware ya resuelve `*.site.turnosrapidos.com.ar` hacia el negocio correspondiente. En desarrollo también existe `/sitio/{slug}` para probar sin DNS. La compra del dominio principal, el registro wildcard en Vercel y los dominios personalizados de clientes siguen pospuestos hasta el despliegue final.

## Capas de la API

La API usa una estructura horizontal explícita, elegida para que una persona nueva pueda seguir una petición de arriba hacia abajo:

1. `controllers`: recibe HTTP y no contiene reglas empresariales.
2. `dto` y `validators`: revisan forma y reglas de entrada.
3. `services`: ejecuta cada caso de uso.
4. `domain`: modela estados y comportamiento empresarial.
5. `repositories/contracts`: declara qué persistencia necesita cada servicio.
6. `repositories/prisma`: persistencia PostgreSQL del flujo productivo.
7. `repositories/memory`: dobles rápidos usados únicamente por pruebas unitarias.
8. `modules`: conecta clases mediante la inyección de dependencias de NestJS.

Los casos del panel resuelven la sesión y la membresía antes de consultar Prisma. Las rutas del mismo origen actúan como una capa de entrada segura para cookies, importaciones, archivos y proveedores externos. La API pública de negocios usa `NegociosPrismaRepository` y la API Nest de reservas usa `ReservasPrismaRepository`; el almacenamiento en memoria no participa del entorno productivo.

## Integraciones y procesos diferidos

- Google Calendar usa un consentimiento distinto al inicio de sesión, cifra tokens e importa cambios mediante `syncToken`. Los turnos propios llevan una propiedad privada para no reimportarse como bloqueos.
- Mercado Pago separa el inicio del checkout de la activación. El retorno del navegador no cambia el estado; el webhook HMAC se guarda con una clave única y se contrasta con la API del proveedor.
- R2 recibe únicamente imágenes que el servidor pudo decodificar y convertir a WebP sin metadatos; luego las sirve con `nosniff` y caché inmutable.
- pg-boss crea colas explícitas y ejecuta cada minuto el vencimiento de retenciones sobre PostgreSQL.

## Convenciones

- Nombres del dominio, documentación y comentarios en español.
- Identificadores tecnicos exigidos por frameworks conservan su nombre oficial.
- Cada archivo humano y comentable empieza con una descripcion breve.
- Los módulos no acceden directamente a tablas de otro módulo: usan sus servicios públicos.
