<!-- Presenta el proyecto, su alcance ejecutable y los pasos para desarrollarlo localmente. -->

# TurnosRapidos

Base funcional y extensible de un SaaS multiempresa para peluquerías, barberías y centros de estética de Argentina. Incluye landing comercial, precios, autenticación, onboarding con autoguardado, panel de gestión, micrositio público, carrito y flujo de reserva.

## Estructura

```text
apps/
  web/       Next.js: landing, acceso, panel, micrositio y reservas
  api/       NestJS: controladores, servicios, repositorios y dominio
  worker/    pg-boss: recordatorios y vencimientos en segundo plano
packages/
  ui/        componentes visuales compartidos
  contratos/ tipos de dominio y contratos públicos
  config/    planes, importes y configuración versionada
prisma/      modelo relacional y migraciones
docs/        arquitectura y material de producto
```

La API está separada por capas técnicas para que el recorrido sea predecible: `controllers → services → repositories`. Los DTO validan entradas, `domain` concentra reglas propias del negocio y `modules` sólo conecta dependencias. La guía [Recorrido del código](./docs/recorrido-codigo.md) explica cada carpeta y qué archivos pueden borrarse sin riesgo.

## Inicio local

Requisitos: Node.js 22, pnpm y PostgreSQL 17. Docker es opcional.

1. Copiar `.env.example` como `.env` y reemplazar los secretos.
2. Iniciar PostgreSQL con `docker compose up -d postgres` o usar una instancia local.
3. Ejecutar `pnpm install`.
4. Aplicar el esquema con `pnpm db:migrate`.
5. Iniciar todo con `pnpm dev`.

La web queda en `http://localhost:3000`, la API en `http://localhost:3001/api/v1` y OpenAPI en `http://localhost:3001/documentacion`.

Para recorrer solamente la interfaz sin iniciar sesión, establecer `MODO_DEMO=true`. Esa variable nunca debe usarse en producción.

## Recorridos disponibles

- `/`: landing comercial responsive.
- `/precios`: planes base, combos y paquetes de WhatsApp.
- `/acceder`: registro e ingreso con Better Auth.
- `/recuperar`: solicitud y cambio de contraseña.
- `/panel`: panel privado o demostrativo.
- `/panel/configuracion`: asistente para crear el negocio, catálogo, diseño y publicación.
- `/sitio/manly-barber`: micrositio público de ejemplo.
- `/reservar/manly-barber`: selección de fecha, horario y datos del cliente.

## Qué funciona y qué requiere credenciales

El repositorio implementa el modelo relacional, autenticación, UI completa del recorrido, contratos REST, retenciones de reserva, protección SQL contra turnos superpuestos, catálogo de planes, verificación de webhooks y workers. El asistente guarda su borrador localmente para probar el recorrido; la persistencia multiusuario del onboarding se conectará a los módulos de negocio en la siguiente entrega. Google OAuth, Resend, Mercado Pago, Meta y R2 quedan listos para conectar mediante variables de entorno, pero no pueden completar operaciones reales sin cuentas y secretos del titular.

El flujo visual de pago confirma una reserva de prueba. La confirmación productiva deberá crearse exclusivamente después del webhook aprobado de Mercado Pago.

## Dominios: etapa final

Durante la validación se usan rutas locales:

- Micrositio sin dominio: `http://localhost:3000/sitio/manly-barber`.
- Panel: `http://localhost:3000/panel`.

En producción, la misma experiencia resolverá:

- Sin dominio propio: `manlybarbercompany.site.turnosrapidos.com.ar`.
- Con dominio conectado: `turnos.manlybarber.com.ar`.
- Con dominio gestionado: el `.com.ar` registrado a nombre del cliente y apuntado al mismo tenant.

La compra del dominio, wildcard, certificados y verificación DNS se deja expresamente para la última etapa del piloto.

## Calidad

```bash
pnpm lint
pnpm test
pnpm build
pnpm validar:encabezados
```

El último comando comprueba que cada archivo comentable comience con una explicación breve en español. JSON, lockfiles, archivos generados y formatos sin comentarios están exceptuados.
