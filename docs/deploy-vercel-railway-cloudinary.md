<!-- Define el recorrido de producción para Vercel, Railway y Cloudinary. -->

# Puesta en producción: Vercel + Railway + Cloudinary

Esta guía deja el repositorio listo para un deploy manual desde los paneles de cada proveedor. No se crean proyectos ni se cargan secretos automáticamente.

## Antes de conectar las plataformas

Hay una diferencia importante entre la infraestructura deseada y la arquitectura actual: `apps/web` no es sólo frontend. Sus páginas, Server Actions y rutas `/api/*` consultan PostgreSQL mediante Prisma dentro de Next.js. `apps/api` (NestJS) existe y se puede desplegar en Railway, pero la web todavía no consume la mayoría de esos endpoints. Por eso, con esta arquitectura, Vercel también necesita conexión a Railway PostgreSQL. Mover toda la lógica de servidor a Railway requeriría otra migración de código.

## Vercel: aplicación web

1. Importar el repositorio como un proyecto Next.js.
2. Usar `apps/web` como **Root Directory** y activar **Include source files outside of the Root Directory**, porque la aplicación usa paquetes y Prisma del monorepo. Vercel documenta esa opción para workspaces con código compartido: <https://vercel.com/docs/monorepos/monorepo-faq>.
3. Usar Node.js 22 y mantener los comandos configurados en `apps/web/vercel.json`. La compilación construye los paquetes compartidos, genera Prisma y compila sólo `@turnos/web`.
4. No ejecutar migraciones desde la compilación de Vercel.
5. Crear las variables de producción que aparecen abajo antes del primer deploy. Para Preview, usar credenciales de una base de prueba y dejar `PUBLIC_SITE_DOMAIN` vacío.

### Variables de Vercel

- `NODE_ENV=production`
- `WEB_URL=https://turnosrapidos.com.ar` y `BETTER_AUTH_URL=https://turnosrapidos.com.ar`
- `PUBLIC_SITE_DOMAIN=site.turnosrapidos.com.ar` (sin `https://`, sin `*.`)
- `DATABASE_URL`: conexión externa de Railway PostgreSQL, con TLS y parámetros de conexión moderados para funciones serverless. No usar la URL privada `*.railway.internal` desde Vercel.
- `BETTER_AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `RESEND_API_KEY` y `EMAIL_REMITENTE`: configurar el mismo remitente y una clave activa de Resend para los correos de autenticación y notificaciones que envía la web. El dominio de envío debe estar verificado en Resend antes de producción.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`
- Credenciales activas de las integraciones que se vayan a utilizar: Google OAuth/Calendar, cifrado de integraciones, correo, Mercado Pago, Google Maps y Meta/WhatsApp. La lista completa está en `.env.example`.
- Mantener `R2_*` sólo si la base aún contiene URLs `/api/archivos/...` de cargas históricas. Las nuevas cargas ya van a Cloudinary.

Nunca agregar secretos `CLOUDINARY_API_SECRET`, `BETTER_AUTH_SECRET`, claves privadas OAuth o credenciales de base de datos con prefijo `NEXT_PUBLIC_`.

## Railway: PostgreSQL, API y worker

Conectar el mismo repositorio y mantener la raíz del monorepo como contexto de build para que pnpm encuentre `pnpm-workspace.yaml`, los paquetes compartidos y `prisma/schema.prisma`. Railway admite comandos por workspace en monorepos: <https://docs.railway.com/deployments/monorepo>.

### PostgreSQL

1. Crear PostgreSQL en Railway.
2. Usar su URL privada como `DATABASE_URL` de API, worker y cualquier proceso de migración dentro de Railway.
3. Para Vercel, habilitar una conexión externa protegida y guardar esa URL únicamente en las variables de Vercel. La base no debe aceptar conexiones abiertas sin TLS/credenciales.
4. Hacer un backup antes de la primera migración productiva.

### Servicio `api` (NestJS)

- Root Directory: `/`
- Build Command:

```sh
pnpm --filter @turnos/config build && pnpm --filter @turnos/contratos build && pnpm db:generate && pnpm --filter @turnos/api build
```

- Start Command: `pnpm --filter @turnos/api start`
- Healthcheck Path: `/salud`
- Variables: `DATABASE_URL` (referencia privada a PostgreSQL), `WEB_URL=https://turnosrapidos.com.ar`, `NODE_ENV=production` y secretos de integraciones/webhooks que realmente procese la API.
- Pre-deploy Command: `pnpm db:deploy` para aplicar `prisma migrate deploy` antes de iniciar la nueva versión. Railway ejecuta los pre-deploy con acceso a las variables privadas: <https://docs.railway.com/deployments/pre-deploy-command>.

### Servicio `worker`

- Root Directory: `/`
- Build Command:

```sh
pnpm --filter @turnos/config build && pnpm --filter @turnos/contratos build && pnpm --filter @turnos/google-calendar build && pnpm --filter @turnos/correo build && pnpm db:generate && pnpm --filter @turnos/worker build
```

- Start Command: `pnpm --filter @turnos/worker start`
- Variables: `DATABASE_URL` privada, `WEB_URL=https://turnosrapidos.com.ar`, `PUBLIC_SITE_DOMAIN=site.turnosrapidos.com.ar`, `RESEND_API_KEY` y `EMAIL_REMITENTE` (los mismos valores que en Vercel), además de las credenciales de Google Calendar y WhatsApp que necesiten los avisos. Ya no se usa Gmail/SMTP para estos correos.
- No generar dominio público para el worker.

En API y worker, configurar watch paths para incluir los directorios de su app, `packages/**`, `prisma/**`, `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml`, así una migración compartida no queda sin deploy.

## Cloudinary: imágenes nuevas

Crear un **upload preset firmado** con `allowed_formats` para JPG, PNG, WebP y AVIF y asignar su nombre a `CLOUDINARY_UPLOAD_PRESET`; no habilitar cargas unsigned. La interfaz valida el límite de 8 MiB, pero Cloudinary no ofrece un límite de tamaño por preset; configurar también el límite de subida a nivel de cuenta para que un cliente modificado no pueda evitar la validación visual ([documentación de presets](https://cloudinary.com/documentation/upload_presets)). El flujo solicita la firma al servidor con sesión válida y sube el archivo directamente desde el navegador, optimizado como WebP hasta 2400 × 1800. La carga directa evita el límite de 4,5 MB de request body de Vercel Functions: <https://vercel.com/docs/functions/limitations>. Cloudinary describe el mismo patrón de firma en backend y envío directo desde navegador: <https://cloudinary.com/documentation/authentication_signatures>.

Las imágenes antiguas guardadas en R2 no se copian solas. Mantener temporalmente `R2_*` en Vercel para servirlas; retirarlas sólo después de migrar esas URLs a Cloudinary y verificar la página pública.

## Dominio raíz y subdominios en Vercel

1. Agregar el dominio raíz de la plataforma al proyecto web y configurar `PUBLIC_SITE_DOMAIN=site.turnosrapidos.com.ar` en producción.
2. Agregar el wildcard `*.site.turnosrapidos.com.ar` al mismo proyecto. El middleware toma el host y reescribe el subdominio `{sede}` internamente a `/sitio/{sede}`; los enlaces de “Mi sitio”, Resumen y avisos usan ese host en producción.
3. Completar la verificación DNS que indique Vercel. Se puede conservar Cloudflare como DNS autoritativo: la documentación actual permite delegar únicamente `_acme-challenge.site` con los dos registros NS de Vercel, habilitar Vercel DNS en el panel del dominio sin cambiar los nameservers del registrador y crear el CNAME `*.site` hacia el destino indicado por Vercel. Mantener inicialmente ese CNAME en DNS Only. Los NS delegados deben permanecer para la renovación automática. Alternativamente se pueden usar los nameservers de Vercel para todo el dominio. Seguir la sección oficial [Use wildcard domains with an external DNS provider](https://vercel.com/docs/domains/working-with-domains/add-a-domain#use-wildcard-domains-with-an-external-dns-provider). Cloudflare Universal SSL en configuración completa no cubre por defecto nombres de segundo nivel como `negocio.site.turnosrapidos.com.ar`; habilitar su proxy requiere resolver por separado esa cobertura de certificado.
4. Mantener `/sitio/{slug}` como URL local y ruta de respaldo.
5. Verificar que cada `Sede.subdominio` esté libre, activo y corresponda a un negocio publicado antes de anunciarlo.

La configuración cubre subdominios de la plataforma. Los dominios propios de cada cliente todavía no tienen flujo de verificación/apuntamiento DNS.

## Secuencia sugerida

1. Configurar Cloudinary y Railway PostgreSQL; cargar variables, sin desplegar todavía.
2. Ejecutar y revisar el backup de producción si ya existe información que conservar.
3. Desplegar API con `pnpm db:deploy` como pre-deploy; comprobar `/salud` y verificar migraciones.
4. Desplegar worker y web.
5. Agregar dominio raíz y wildcard, esperar DNS/certificado, y probar login, una carga de imagen, reserva, notificación y un subdominio de prueba.
6. Mantener R2 hasta confirmar la migración de imágenes históricas.

## Punto pendiente antes de producción

Aunque se desplieguen API y worker en Railway, el panel web ejecuta operaciones de servidor y acceso a datos dentro de Vercel. Esta guía configura esa conexión explícitamente; si el requisito es que **todo** el backend corra en Railway, hay que migrar las consultas y acciones de Next hacia NestJS antes del deploy.
