# Demo de Carla Cicero

## Cuenta en producción

El usuario autorizó expresamente cargar esta demo en `turnosrapidos.com.ar`, dentro del panel y sitio existentes. El alta utiliza el mismo script, limitado al destino Railway comprobado (`yamanote.proxy.rlwy.net:50874/railway`), con `CARLA_DEMO_PRODUCTION_CONFIRM=crear-cuenta-demo-carla` y una contraseña demo aleatoria de al menos 16 caracteres en `CARLA_DEMO_PASSWORD`. Nunca imprime la conexión de base ni cambia negocios existentes. Requiere que la migración de cuentas de equipo ya esté aplicada; no ejecuta migraciones productivas.

Las imágenes se sirven desde el dominio principal. No se usa la presentación HTML para iniciar sesión o mostrar el negocio real. La contraseña local de la tabla siguiente no es la contraseña productiva. Las cuentas usan email verificado y aceptación simulados exclusivamente como datos de demostración. Los avisos automáticos quedan apagados y no se crean correos ni cobros externos.

## Presentación inmediata

Abrir `apps/web/public/demo/carla/presentacion.html` en el navegador. Funciona sin servidor ni base de datos. Incluye Resumen, Agenda con filtro por integrante, Pacientes, Servicios, Equipo, Inventario, Compras, Caja, Reportes, Actividad y Mi sitio. El selector superior cambia entre Carla (dueña) y Lucía (empleada). Valeria tiene ficha y agenda, pero su invitación sigue pendiente y no puede ingresar.

Es una presentación interactiva con datos de ejemplo; no es una sesión autenticada, no guarda modificaciones y sus cifras no son una lectura de PostgreSQL. Los permisos efectivos corresponden al sistema real, no a esta presentación visual.

## Cargar la cuenta en el sistema real, local

1. Abrir Docker Desktop y esperar a que el motor esté funcionando. No resetearlo ni borrar volúmenes.
2. Confirmar que la conexión usa PostgreSQL **local** en `localhost:5433`, no Railway. Preferentemente emplear el esquema aislado `equipo_prueba_20261003` ya preparado para esta funcionalidad.
3. Aplicar migraciones y generar Prisma. El alta demo requiere `20261003140000_cuentas_equipo`.
4. Crear la cuenta:

```powershell
$env:DATABASE_URL='postgresql://turnos:turnos@localhost:5433/turnos_rapidos?schema=equipo_prueba_20261003'
pnpm db:deploy
pnpm db:generate
pnpm db:demo:carla
```

5. Iniciar la web local **con esa misma conexión de base**. Mantener vacías las credenciales de Mercado Pago, Google y Resend para la demostración, y no iniciar un worker conectado a proveedores reales. No usar los comandos de fixtures contra producción.
6. Entrar a `/acceder` con las cuentas siguientes:

| Acceso                           | Email                            | Contraseña local |
| -------------------------------- | -------------------------------- | ---------------- |
| Dueña                            | `carla.demo@example.com`         | `CarlaDemo2026!` |
| Empleada incorporada             | `lucia.carla.demo@example.com`   | `CarlaDemo2026!` |
| Invitación pendiente, sin cuenta | `valeria.carla.demo@example.com` | No tiene acceso  |

El sitio queda en `/sitio/carla-cicero-demo`. El comando es conservador: si ya existe esta demo, informa sus datos y no la regenera; si el slug o los emails pertenecen a otra cuenta, se detiene sin sobrescribirlos.

## Contenido de la cuenta

- Carla como dueña y exactamente dos profesionales ficticias: Lucía Méndez y Valeria Suárez.
- Un local en **Neuquén 1939**, sin afirmar una ciudad, sede OMINT ni cobertura todavía no confirmadas.
- Horarios de lunes a viernes de 09:00 a 18:00 y sábados de 09:00 a 13:00. Agendas individuales, con descansos entre turnos y bloqueos de muestra.
- 64 pacientes ficticios; historial desde 45 días antes hasta 21 días después de crear la cuenta.
- Ocho servicios de consulta, coordinación, preparados autólogos, retiro y seguimiento. Sus precios son de ejemplo, no tarifas verificadas de Carla.
- Diez insumos, stock compartido, mínimos, alerta de reposición, lotes ficticios, vencimientos y ubicaciones. Ocho compras y 38 consumos trazables.
- Cobros completos y parciales, señas simuladas y saldos pendientes. También 18 ventas de prestaciones independientes, sin duplicar cobros de turnos. Los cobros del dueño conservan la atribución al profesional; las compras y gastos quedan atribuidos al local, no al empleado.
- Actividad con autoría, caja e información para reportes. Plan Pro de demostración sin suscripción ni débito externo.
- Lucía aparece vinculada con email verificado y aceptación **simulada para esta demo**. Valeria figura pendiente. No se crean correos pendientes ni enlaces utilizables para estas invitaciones.

## Identidad y límites

El logo proporcionado se adaptó con la herramienta integrada de imágenes: conservar el monograma CC violeta, fondo blanco opaco, composición centrada y dos líneas exactas: «Terapia celular» / «y Medicina regenerativa». Archivo: `apps/web/public/demo/carla/logo-clinica.png`.

El hero es la imagen original aportada, sin modificación, en `apps/web/public/demo/carla/hero-referencia.jpeg`. Su marca OMINT es parte de esa referencia; la demo no acredita afiliación ni cobertura. Confirmar autorización y relación institucional antes de publicarla.

No se publican matrículas, cargos hospitalarios, diagnósticos reales ni resultados garantizados. Esta cuenta no es una historia clínica ni sustituye procesos clínicos de habilitación, consentimiento o trazabilidad.

Prueba offline de presentación: `pnpm --filter @turnos/web exec playwright test --config playwright.carla.config.ts`. La carga efectiva en PostgreSQL queda pendiente mientras Docker no responda; no anunciar que las cuentas ya están creadas antes de ejecutar el comando correctamente.
