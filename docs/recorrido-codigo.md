<!-- Explica cómo leer el repositorio, qué genera cada herramienta y qué piezas aún son de demostración. -->

# Recorrido del código

## Qué se escribe y qué se genera

El código que se mantiene está en `src`, `prisma`, `scripts` y `docs`. Estas carpetas son generadas y se pueden borrar cuando los procesos están detenidos:

| Carpeta o archivo | Quién lo crea | Para qué sirve | ¿Se versiona? |
|---|---|---|---|
| `.turbo` | Turborepo | Caché, hashes y logs internos de tareas | No |
| `.next` | Next.js | Compilación y caché del frontend | No |
| `dist` | TypeScript/NestJS | JavaScript ejecutable y declaraciones `.d.ts` | No |
| `*.tsbuildinfo` | TypeScript | Caché de compilación incremental | No |
| `node_modules` | pnpm | Dependencias instaladas | No |

El bloque `__decorate` que aparece en JavaScript es un helper generado por TypeScript para ejecutar decoradores como `@Controller` y `@Injectable`. No se edita. El archivo legible correspondiente siempre es el `.ts` dentro de `src`.

Los `.d.ts` contienen sólo declaraciones de tipos para otras herramientas. Los `.js` de `dist` contienen el resultado ejecutable. Ambos reaparecen con `pnpm build`.

## Recorrido de una llamada a la API

Ejemplo: `POST /api/v1/publico/reservas`.

1. `main.ts` inicia NestJS, seguridad, CORS, validación y Swagger.
2. `app.module.ts` carga los módulos y el middleware de seguimiento.
3. `routes/api.routes.ts` aporta el texto estable de la ruta.
4. `controllers/reservas.controller.ts` recibe el cuerpo HTTP.
5. `dto/reservas/crear-reserva.dto.ts` valida tipos, email y campos requeridos.
6. `services/reservas.service.ts` coordina el caso de uso.
7. `validators/reserva.validator.ts` aplica reglas específicas de entrada.
8. `domain/entities/reserva.entity.ts` crea la reserva y controla su estado.
9. `repositories/contracts/reservas.repository.ts` define la persistencia que se necesita.
10. `repositories/memory/reservas-memoria.repository.ts` la guarda temporalmente.

`modules/reservas.module.ts` conecta esas clases. No contiene lógica. En producción, el repositorio en memoria se reemplazará por uno de Prisma/PostgreSQL; la interfaz permite hacerlo sin modificar el controlador ni el servicio.

## Cómo ver la API

Al ejecutar `pnpm dev`, la documentación interactiva queda en `http://localhost:3001/documentacion`. Swagger muestra las rutas y permite probar solicitudes. El JSON OpenAPI se publica en `http://localhost:3001/documentacion-json`.

Actualmente los DTO usan `class-validator`, la integración estándar de NestJS. No se está usando Zod. Zod y Swagger resuelven problemas distintos: Zod valida datos; Swagger/OpenAPI documenta y permite explorar la API.

Las áreas actuales aparecen en:

- `controllers/negocios.controller.ts`
- `controllers/reservas.controller.ts`
- `controllers/facturacion.controller.ts`
- `controllers/integraciones.controller.ts`
- `controllers/salud.controller.ts`

## Frontend: `apps/web`

Next.js usa enrutamiento basado en carpetas. `page.tsx` representa una página, `layout.tsx` un marco compartido y los CSS contienen sus estilos.

Una carpeta entre corchetes es un segmento dinámico. Por ejemplo, `sitio/[slug]/page.tsx` atiende tanto `/sitio/manly-barber` como `/sitio/otro-negocio`; `slug` es el identificador legible del negocio que cambia en cada URL.

`.next` es sólo la salida de Next.js. `next-env.d.ts` es la excepción: aunque es generado, Next.js espera encontrarlo en el proyecto y conviene conservarlo.

## Worker: `apps/worker`

El worker es otro proceso, sin interfaz web. Atiende trabajos que no deben demorar una respuesta HTTP, como recordatorios y vencimientos.

- `main.ts`: punto de entrada corto.
- `config/worker.config.ts`: lee la conexión.
- `worker.ts`: inicia pg-boss y registra las colas.
- `jobs/*.job.ts`: contiene una tarea por archivo.

pg-boss usa PostgreSQL como cola. Si no existe `DATABASE_URL`, el proceso informa que está preparado y termina sin fallar.

## Paquetes compartidos

- `packages/config`: precios, planes y reglas configurables compartidas.
- `packages/contratos`: tipos comunes entre frontend y API.
- `packages/ui`: componentes visuales reutilizables.

Sus carpetas `dist` se generan porque Node ejecuta JavaScript, no TypeScript directamente en producción. Se eliminan con la limpieza y se regeneran antes del desarrollo mediante `predev`.

## Prisma y base de datos

`prisma/schema.prisma` es el modelo legible de tablas, relaciones, índices y enumeraciones. `prisma/migrations/*/migration.sql` es la instrucción histórica que PostgreSQL ejecuta para crear o modificar la base. `migration_lock.toml` le indica a Prisma qué motor de base usa el historial y debe conservarse.

`pnpm db:generate` genera el cliente TypeScript. `pnpm db:migrate` crea y aplica migraciones durante desarrollo.

El esquema existe, pero los servicios demo todavía usan repositorios en memoria. Conectar los repositorios Prisma es trabajo pendiente antes de considerar persistentes las reservas, negocios y eventos.

## Scripts y comandos

- `scripts/validar-encabezados.mjs`: falla si un archivo comentable no empieza explicando su propósito.
- `pnpm dev`: inicia aplicaciones en modo desarrollo.
- `pnpm lint`: comprueba tipos y encabezados.
- `pnpm test`: ejecuta pruebas.
- `pnpm build`: crea `.next`, `dist`, `.turbo` y cachés de TypeScript.

## Dominio propio

Durante la prueba se usa `/sitio/{slug}` en localhost. La resolución por subdominio, wildcard, certificados y dominios personalizados queda deliberadamente para la etapa final. En ese momento se documentarán y probarán ambos recorridos:

- Sin dominio propio: `{negocio}.site.turnosrapidos.com.ar`.
- Con dominio propio: un host del cliente que resuelva al mismo negocio.
