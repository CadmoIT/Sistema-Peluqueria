<!-- Presenta el proyecto, su alcance ejecutable y los pasos para desarrollarlo localmente. -->

# TurnosRapidos

SaaS multiempresa para negocios que trabajan con turnos. Incluye autenticación, configuración inicial, panel operativo, agenda, clientes, catálogo, equipo, inventario, caja, reportes, editor del micrositio y reservas públicas.

## Estructura

```text
apps/
  web/       Next.js: landing, acceso, panel, micrositio y reservas
  api/       NestJS: controladores, servicios, repositorios y dominio
  worker/    pg-boss: avisos, vencimientos y sincronización de Google
packages/
  ui/        componentes visuales compartidos
  contratos/ tipos de dominio y contratos públicos
  config/    planes, importes y configuración versionada
  google-calendar/ OAuth y sincronización compartida entre web y worker
prisma/      modelo relacional y migraciones
docs/        arquitectura y material de producto
```

La API está separada por capas técnicas para que el recorrido sea predecible: `controllers → services → repositories`. Los DTO validan entradas, `domain` concentra reglas propias del negocio y `modules` sólo conecta dependencias. La guía [Recorrido del código](./docs/recorrido-codigo.md) explica cada carpeta y qué archivos pueden borrarse sin riesgo.

## Personalización por tipo de negocio

El rubro se elige en Primeros pasos y se guarda en `Negocio.configuracion.tipoNegocio`.
Dueño y Administrador pueden cambiarlo desde Configuraciones → Datos del negocio;
la actualización mezcla sólo `tipoNegocio` y `rubro` en el JSON, sin borrar las demás claves ni datos operativos.
Las cuentas antiguas pueden resolverse por `rubro`; los valores desconocidos utilizan el perfil general.

Los perfiles tipados están centralizados en `apps/web/src/lib/perfiles-negocio.ts`:
icono de Servicios, ejemplos de servicio, categoría y nombre del negocio.
El layout resuelve el rubro desde la membresía autenticada y comparte sólo su identificador.
La navegación de escritorio y móvil, Resumen y formularios reutilizan ese perfil;
los iconos se resuelven en `componentes/panel/iconos-rubro.ts` desde Lucide React.
Los ejemplos nunca crean datos ni reemplazan campos existentes.

Para agregar un rubro, actualizar el catálogo de Primeros pasos, su perfil y las pruebas de cobertura.
No distribuir condiciones por rubro en las páginas ni duplicar el panel.
Las futuras funciones sectoriales serán extensiones del núcleo con especificación propia
de datos, permisos y conservación de información al cambiar el rubro.
Esta entrega no incorpora mascotas, historias clínicas ni reservas grupales.

## Inicio local

Requisitos: Node.js 22, pnpm y PostgreSQL 17. Docker es opcional.

1. Copiar `.env.example` como `.env` y reemplazar los secretos.
2. Iniciar PostgreSQL con `docker compose up -d postgres` o usar una instancia local.
3. Ejecutar `pnpm install`.
4. Aplicar el esquema con `pnpm db:migrate`.
5. Iniciar todo con `pnpm dev`.

La web queda en `http://localhost:3000`, la API en `http://localhost:3001/api/v1` y OpenAPI en `http://localhost:3001/documentacion`.

## Recorridos disponibles

- `/`: landing comercial responsive.
- `/precios`: planes base, combos y paquetes de WhatsApp.
- `/acceder`: registro e ingreso con Better Auth.
- `/recuperar`: solicitud y cambio de contraseña.
- `/panel`: redirección al resumen privado en `/panel/resumen`.
- `/panel/agenda`: agenda diaria, mini calendario y columnas por profesional.
- `/panel/clientes`, `/panel/servicios` y `/panel/equipo`: gestión operativa.
- `/panel/inventario`, `/panel/caja` y `/panel/reportes`: control administrativo inicial.
- `/panel/mi-sitio`: editor con borrador, vista previa y publicación.
- `/panel/configuracion`: negocio, política de contacto, sedes y Google Places.
- `/panel/facturacion`: plan, estado de suscripción e historial de cobros.
- `/sitio/{slug}` y `/reservar/{slug}`: micrositio y reserva pública reales.

## Qué funciona y qué requiere credenciales

El panel y el sitio leen PostgreSQL. Las reservas públicas calculan horarios disponibles, validan la política de contacto y evitan superposiciones también desde la base. Clientes acepta importación CSV/Excel con vista previa; Inventario registra ajustes; Caja crea ventas y descuenta stock en una transacción; Reportes resume día, semana o mes.

### Clientes: archivo, exportación e importación

Eliminar un cliente archiva su ficha: conserva turnos, ventas y notas anteriores. La vista Archivados permite restaurarlo. Los contadores y las nuevas reservas manuales muestran sólo activos; una reserva pública con el mismo email o teléfono reactiva la ficha sin duplicarla.

Exportar clientes descarga los datos del negocio autenticado en Excel o CSV, respetando la búsqueda y la vista Activos/Archivados. Excel conserva los teléfonos como texto y CSV incluye UTF-8 con BOM y protección frente a fórmulas. La Plantilla de ejemplo se descarga aparte y contiene dos filas ficticias identificadas.

La importación lee la primera hoja de `.xlsx` o CSV separado por comas, punto y coma o tabulaciones, hasta 5 MB y 1.000 filas. Reconoce encabezados como Mail, E-mail, Teléfono, Número, Móvil y Nro. de celular sin distinguir tildes o mayúsculas. Las columnas desconocidas se pueden asociar manualmente; una columna de nombre completo no se divide automáticamente. Antes de guardar muestra duplicados, conflictos y errores por fila. Completar datos vacíos nunca reemplaza información existente y una importación no restaura archivados silenciosamente.

Servicios utiliza un formulario reducido: nombre, categoría, precio, duración y seña. Profesionales y locales se eligen sólo cuando hay varios activos; con uno solo se asignan desde el servidor. Crear y editar no borran información anterior que ya no aparece en el formulario, y los cambios válidos se reflejan en el catálogo del micrositio.

Google Calendar cuenta con consentimiento separado, tokens cifrados, sincronización incremental de ocupaciones y exportación de turnos sin correo ni teléfono. Google Places actualiza puntaje y cantidad de valoraciones. Mercado Pago crea la suscripción y sólo activa el sitio después de validar el webhook y consultar el recurso al proveedor. Cloudinary recibe las nuevas imágenes mediante carga directa firmada: el servidor autoriza la sesión y limita el destino por negocio, mientras que el archivo no atraviesa la función de Vercel. Las rutas de R2 permanecen para servir imágenes cargadas antes de esta migración. Estas integraciones requieren las credenciales documentadas en `.env.example`.

### Agenda diaria y Google Calendar

La agenda abre el día actual del negocio. El mini calendario y los días superiores seleccionan la fecha, conservada en `?fecha=AAAA-MM-DD`. Cada profesional tiene su columna y las horas son de 24 horas. Los filtros de local/profesional desaparecen cuando existe uno solo; los estados pueden ocultarse desde la leyenda.

Para habilitar Google Calendar, activar Calendar API en Google Cloud, configurar el cliente OAuth de aplicación web y autorizar el retorno `${WEB_URL}/api/integraciones/google-calendar/callback`. Cargar `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` y `INTEGRATIONS_ENCRYPTION_KEY` en los entornos de web y worker. El permiso requerido es `https://www.googleapis.com/auth/calendar.app.created`: sólo permite trabajar con calendarios separados creados por esta aplicación, sin acceder al calendario personal.

Desde Agenda se elige negocio, local o profesional antes de autorizar. El calendario “TurnosRápidos · nombre del negocio” debe estar activado en Google Calendar del teléfono, usando la misma cuenta. El worker importa ocupaciones y reintenta exportaciones cada cinco minutos. Los eventos usan identificadores estables y una huella para evitar duplicados. Desconectar detiene la sincronización y conserva los eventos en Google. Sin credenciales, la interfaz indica “No configurado”. La lógica se comparte entre web y worker en `packages/google-calendar`; sus pruebas usan proveedores simulados y no envían eventos reales.

Las nuevas imágenes se convierten y optimizan como WebP al cargarse en Cloudinary (máximo 2400 × 1800). Las firmas se generan sólo en el servidor; nunca se envía el secreto de Cloudinary al navegador. Los archivos históricos de R2 necesitan conservar sus credenciales o migrarse antes de retirarlas.

## Cuenta de demostración local

Con PostgreSQL local funcionando, `pnpm db:demo` crea o regenera exclusivamente `demo@turnosrapidos.com.ar` con la contraseña `DemoTurnos2026!`. Incluye dos locales, profesionales, servicios, clientes, turnos, stock y ventas ficticias. El comando rechaza bases de datos remotas y no modifica `admin@gmail.com`. Nunca usar esas credenciales en un entorno publicado.

`pnpm test:e2e` regenera esta demo y comprueba en Chromium el acceso, las rutas del panel, el catálogo y el ancho móvil. Requiere instalar una vez el navegador con `pnpm --filter @turnos/web exec playwright install chromium`.

## Deploy en Vercel y Railway

La configuración inicial para publicar este monorepo en Vercel, Railway y Cloudinary está en [Guía de deploy](./docs/deploy-vercel-railway-cloudinary.md). La guía incluye los comandos de build, migraciones, variables, wildcard DNS y el orden de puesta en línea.

El dominio base se configura en `PUBLIC_SITE_DOMAIN` (por ejemplo `site.turnosrapidos.com.ar`); cada local se publica como `{subdominio}.site.turnosrapidos.com.ar`. En desarrollo local se conserva `/sitio/{slug}`.

La configuración actual prepara subdominios wildcard propios de la plataforma. Los dominios personalizados de cada cliente todavía requieren una etapa aparte de verificación DNS y vinculación de tenant.

## Calidad

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm validar:encabezados
```

El último comando comprueba que cada archivo comentable comience con una explicación breve en español. JSON, lockfiles, archivos generados y formatos sin comentarios están exceptuados.
