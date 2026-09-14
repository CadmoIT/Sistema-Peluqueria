<!-- Presenta el proyecto, su alcance ejecutable y los pasos para desarrollarlo localmente. -->

# TurnosRapidos

SaaS multiempresa para negocios que trabajan con turnos. Incluye autenticación, configuración inicial, panel operativo, agenda, clientes, catálogo, equipo, inventario, caja, reportes, editor del micrositio y reservas públicas.

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

## Recorridos disponibles

- `/`: landing comercial responsive.
- `/precios`: planes base, combos y paquetes de WhatsApp.
- `/acceder`: registro e ingreso con Better Auth.
- `/recuperar`: solicitud y cambio de contraseña.
- `/panel`: resumen privado con información real.
- `/panel/agenda`: calendario diario, semanal y mensual.
- `/panel/clientes`, `/panel/servicios` y `/panel/equipo`: gestión operativa.
- `/panel/inventario`, `/panel/caja` y `/panel/reportes`: control administrativo inicial.
- `/panel/mi-sitio`: editor con borrador, vista previa y publicación.
- `/panel/configuracion`: negocio, política de contacto, sedes y Google Places.
- `/panel/facturacion`: plan, estado de suscripción e historial de cobros.
- `/sitio/{slug}` y `/reservar/{slug}`: micrositio y reserva pública reales.

## Qué funciona y qué requiere credenciales

El panel y el sitio leen PostgreSQL. Las reservas públicas calculan horarios disponibles, validan la política de contacto y evitan superposiciones también desde la base. Clientes acepta importación CSV/Excel con vista previa; Inventario registra ajustes; Caja crea ventas y descuenta stock en una transacción; Reportes resume día, semana o mes.

Google Calendar cuenta con consentimiento separado, tokens cifrados, sincronización incremental de ocupaciones y exportación de turnos sin correo ni teléfono. Google Places actualiza puntaje y cantidad de valoraciones. Mercado Pago crea la suscripción y sólo activa el sitio después de validar el webhook y consultar el recurso al proveedor. R2 recibe logo, portadas, servicios y fotos mediante una carga autenticada que valida y optimiza cada imagen en el servidor. Estas integraciones requieren las credenciales documentadas en `.env.example`.

Las imágenes se decodifican en el servidor, corrigen su orientación, se reducen a un máximo de 2400 × 1800, pierden sus metadatos y se convierten a WebP antes de llegar a R2. Si R2 no está configurado, el editor mantiene la alternativa de pegar una URL y explica el motivo sin romper el formulario.

## Cuenta de demostración local

Con PostgreSQL local funcionando, `pnpm db:demo` crea o regenera exclusivamente `demo@turnosrapidos.com.ar` con la contraseña `DemoTurnos2026!`. Incluye dos locales, profesionales, servicios, clientes, turnos, stock y ventas ficticias. El comando rechaza bases de datos remotas y no modifica `admin@gmail.com`. Nunca usar esas credenciales en un entorno publicado.

`pnpm test:e2e` regenera esta demo y comprueba en Chromium el acceso, las rutas del panel, el catálogo y el ancho móvil. Requiere instalar una vez el navegador con `pnpm --filter @turnos/web exec playwright install chromium`.

## Dominios: etapa final

Durante la validación se usan rutas locales:

- Micrositio sin dominio: `http://localhost:3000/sitio/{slug}`.
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
pnpm test:e2e
pnpm build
pnpm validar:encabezados
```

El último comando comprueba que cada archivo comentable comience con una explicación breve en español. JSON, lockfiles, archivos generados y formatos sin comentarios están exceptuados.
