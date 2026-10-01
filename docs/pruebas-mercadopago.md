# Mercado Pago: pruebas y pendientes de despliegue

## Alcance y límites

Las pruebas unitarias ejecutan el receptor, checkout, renovación y procesador reales, con sesiones, PostgreSQL y API simulados. Las pruebas de integración y navegador descritas abajo usan además PostgreSQL local aislado y cuentas efímeras. No realizan cobros, no necesitan secretos reales y no modifican negocios existentes. El mock de persistencia reproduce unicidad/upsert, pero no demuestra las restricciones ni los bloqueos reales de PostgreSQL. Inspeccionar la consulta de reclamo no equivale a matar y recuperar un contenedor real.

## Ejecutar

Desde la raíz:

```powershell
pnpm --filter @turnos/web exec tsx --test src/servicios/facturacion-mercadopago.spec.ts src/servicios/firma-mercadopago.service.spec.ts src/servicios/comprador-mercadopago.spec.ts src/servicios/webhook-mercadopago.spec.ts
pnpm --filter @turnos/worker test
pnpm --filter @turnos/web exec tsc --noEmit
pnpm --filter @turnos/worker build
```

Los mensajes de error simulados son esperados: las pruebas comprueban su recuperación. Una salida con fallos de tests o código distinto de cero no es éxito.

## Cobertura automatizada

- Checkout: origen ajeno, sesión ausente, rol no autorizado, plan inexistente, token ausente, creación pending, importe/referencia/correo, redirección, reutilización de clave persistida, rechazo del proveedor, caída de red, respuesta sin URL y fallos durante cambio de plan. No se activa el plan por crear un checkout.
- Comprador ficticio: configuración opcional, normalización, rechazo de correos reales; sin configuración se conserva el correo del usuario.
- Renovación: desactivar/reactivar, operación ya pausada, cancelación definitiva no reactivable, referencia de otro negocio, plan Gratis, cuerpo inválido y rechazo del proveedor. Se conserva el período y el plan; no se cambia el estado local ante rechazo.
- Webhook: firma válida, inválida, ausente; cuerpo malformado; secreto ausente; persistencia indisponible; repetición secuencial y concurrente del mismo evento. Se responde 503 si no puede guardarse.
- Worker: pago aprobado activa plan; pendiente/anulado no activan; rechazo abre gracia; reembolso/contracargo pausan; reembolso parcial se distingue. Moneda/importe/relación/negocio incorrectos impiden activación.
- Factura recurrente: relación recuperada desde factura, IDs numéricos/textuales, relación incompleta o contradictoria rechazada.
- Idempotencia del pago: dos eventos distintos de una factura conservan una sola operación mediante upsert, sin extender proximoCobro.
- Reintentos: red/401/429/500, factura todavía sin pago, backoff, límite de intentos y recuperación posterior al fallo. Reactivación limitada al error histórico de vinculación.
- Reclamo: la consulta conserva SKIP LOCKED, recuperación después de diez minutos y elegibilidad por fecha de reintento; el procesamiento de un evento recuperado usa el mismo flujo.
- Vencimiento: renovación cancelada y período pasado termina en CANCELADA; fecha futura conserva ACTIVA. No requiere esperar un mes.
- Fin de gracia: el trabajo de vencimiento pausa solo EN_GRACIA con fecha pasada; conserva gracia futura y suscripciones activas.
- Sondeo: evita superposición local y libera el bloqueo después de un error, tanto para pagos como para correos.

## Ya observado en el entorno de prueba

- Compra ficticia aprobada, entrega real de webhooks 200 y activación de Plus.
- Usuario confirmó desactivación/reactivación de renovación, conservando el período pagado.
- Capturas confirmaron renovación visible en Plus, oculta en Gratis e historial del pago en Plus. Esto no certifica los permisos de todas las funciones del servidor.
- Se detectó que "Administrar suscripción" apuntaba a planes. Se corrigió a "Cambiar plan" y se agregó un enlace separado a `https://www.mercadopago.com.ar/subscriptions`, solo con plan pagado asociado, en otra pestaña. La URL respondió redirigiendo al login oficial; falta verificar autenticado con el comprador que permite ver y gestionar su suscripción. No es un enlace directo a una suscripción ni garantiza por sí solo que pueda editar la tarjeta.
- La mejora de sondeo cada cinco segundos y actualización visual necesita verificación después de desplegar la versión correspondiente.

## Pendientes: ejecutar después de aprobar las pruebas automatizadas

### Pausa acordada el 01/10/2026

El usuario reportó HTTP 503 en `railway.com/.railway/__challenge` desde distintos navegadores. Esto no confirma por sí solo que el worker o PostgreSQL estén caídos. Se posponen las comprobaciones que requieren acceso a Railway, especialmente reinicio/recuperación, inspección de eventos, concurrencia y vencimiento en datos aislados. Vercel figura Ready según el usuario.

Al terminar la última prueba que pueda hacerse sin Railway, recordar expresamente retomar estas verificaciones antes de pasar a credenciales reales. No se ha realizado todavía la prueba de recuperación por reinicio. No se creó una automatización ni un aviso programado.

Comprobación real del endpoint Vercel el 01/10/2026: POST con firma deliberadamente inválida respondió 401 y `Firma inválida.`. POST sin firma también respondió 401. Se utilizaron identificadores ficticios y no se enviaron firmas válidas ni se consultaron pagos reales. La inspección directa de PostgreSQL para confirmar ausencia de registros queda pendiente; el código rechaza ambas solicitudes antes de la inserción.

Usar un entorno separado con vendedor/comprador ficticios. No alterar fechas ni detener servicios que atiendan clientes reales.

1. Confirmar commits activos de Vercel y Railway, mismas credenciales del vendedor y misma base; migraciones y restricciones únicas aplicadas.
2. Repetir una compra de prueba para medir hora de aprobación, recepción, procesamiento y activación. Comprobar actualización visual, pestaña oculta, límite de dos minutos, navegación y errores de red. No prometer cinco segundos desde el pago: depende también de MP.
3. Enviar un webhook real dos veces con firma válida mediante herramientas controladas; conservar un solo EventoExterno y un solo Pago. Dos eventos distintos del mismo pago tampoco deben duplicarlo. No compartir secretos, cookies ni HAR.
4. Verificar en el endpoint desplegado que firma ausente/incorrecta devuelve 401 y no guarda registros.
5. En base aislada, procesar eventos simultáneamente con dos workers: comprobar unicidad y SKIP LOCKED; confirmar rollback si falla la transacción. Revisar el estado final, no solo los logs.
6. Interrumpir un worker con eventos pendientes y reiniciarlo: deben recuperarse sin doble pago. Para eventos reclamados, comprobar recuperación tras el umbral de diez minutos. Fallos del proveedor respetan proximoIntentoEn y no se reintentan cada cinco segundos.
7. Simular en datos exclusivos de prueba un vencimiento pasado con renovación cancelada. Comprobar CANCELADA y que las funcionalidades pagas dejan de estar habilitadas. Confirmar también vencimiento de gracia tras impago.
8. Reembolso total/parcial, rechazo, contracargo y eventos fuera de orden: reconciliar con el estado canónico consultado a MP. Comprobar acceso, historial y auditoría, sin producir cobros reales para probarlos.
9. Cambiar Plus/Pro y renovar al siguiente período: comprobar importes, fechas, permisos y aislamiento entre negocios. Revisar también checkout simultáneo y usuarios con correo de TurnosRápidos diferente al de Mercado Pago.
10. Prueba de carga y monitorización: tiempo de consulta y tamaño de backlog, conexiones PostgreSQL, límites MP, ausencia de ejecuciones solapadas. El sondeo genera carga por instancia aunque no haya eventos.
11. Antes de vender: eliminar MERCADOPAGO_TEST_PAYER_EMAIL, sustituir tokens en web/worker por vendedor real, configurar su webhook/secret y desplegar. Nunca mezclar claves ficticias y reales. Definir control de eventos fallidos y alertas operativas.

## Criterio de cierre H04

Pruebas automatizadas aprobadas más verificaciones de despliegue documentadas. Las pruebas con mocks no certifican por sí solas producción, aislamiento de transacciones ni experiencia del navegador.

## Prueba aislada de vencimiento con PostgreSQL real

Archivo: `apps/worker/src/jobs/vencimiento-mp.integracion.spec.ts`. Deshabilitada por defecto. Solo admite host local, un esquema cuyo nombre comience con `mp_vencimiento_prueba_` y un entorno distinto de production. No usa credenciales reales de MP; bloquea llamadas externas. Crea dos negocios ficticios (período vencido y futuro), ejecuta el procesador real, comprueba estados, ausencia de cobros y rechazo 404 de la API de disponibilidad del vencido. Elimina solamente los negocios creados por esa ejecución. El esquema dedicado queda disponible para repetir la prueba.

Con Docker/PostgreSQL local disponible, desde la raíz (no usar DATABASE_URL de Railway):

```powershell
docker compose up -d postgres
$env:DATABASE_URL = 'postgresql://turnos:turnos@localhost:5433/turnos_rapidos?schema=mp_vencimiento_prueba_20261001'
pnpm db:deploy
$env:PRUEBAS_VENCIMIENTO_MP = '1'
pnpm --filter @turnos/web exec tsx --test ../worker/src/jobs/vencimiento-mp.integracion.spec.ts
Remove-Item Env:PRUEBAS_VENCIMIENTO_MP
Remove-Item Env:DATABASE_URL
```

Usar una terminal nueva dedicada a la prueba para no sobrescribir variables propias. Esta comprobación no demuestra por sí sola todas las restricciones del panel ni la apariencia de la página suspendida; eso permanece en el checklist de despliegue.

Recuperación tras parada: el usuario informó que el worker volvió Online y el evento quedó PROCESADO con un intento tras dejarlo pendiente. Falta inspeccionar recuperación de un reclamo interrumpido en PROCESANDO, que no es el mismo escenario.

Intento local del 01/10/2026: compilación del worker aprobada. Docker Desktop se inició, pero el motor no respondió a docker info ni compose; se cancelaron esos dos comandos pendientes. No se ejecutaron migraciones ni la prueba habilitada en PostgreSQL. Por tanto el vencimiento real sigue PENDIENTE; no confundir el test omitido por defecto con una prueba aprobada.

Segundo intento del 01/10/2026, tras iniciar correctamente Docker: APROBADO, 1 test, 0 fallos, 0 omitidos. Se aplicaron las 16 migraciones exclusivamente en el esquema local `mp_vencimiento_prueba_20261001`. El procesador real canceló el período vencido, conservó el futuro y la API real de disponibilidad respondió 404 al negocio vencido. No hubo llamadas externas ni pagos creados. Los dos negocios efímeros se eliminaron al finalizar; se conserva el esquema local de pruebas. Esto reemplaza el resultado pendiente del intento anterior, no certifica todavía todas las restricciones del panel ni el vencimiento en Railway.

## Resultado local del 01/10/2026

### Ampliación: vigencia del panel y ciclo del sitio

Reglas acordadas con el usuario:

- La prueba del negocio dura siete días. Al terminar se suspende el sitio público y el panel queda en solo lectura; se mantienen consulta, exportación, seguridad de la cuenta y facturación.
- Sin ninguna compra previa, el sitio se retira reversiblemente treinta días después del fin de prueba (día 37 desde su inicio). Se conserva slug/subdominio, configuración, archivos, clientes y turnos; no se elimina el negocio.
- Sólo el sitio retirado muestra «Volver a generar mi sitio». El servidor exige dueño/administrador y Plus o Pro con período vigente. Pagar no lo restaura por sí solo: la recuperación es explícita, sin reiniciar la prueba.
- La franja superior avisa en los últimos tres días exclusivamente cuando la renovación está desactivada; al vencer invita a activar un plan. El reloj de la franja es local, no sondea MP ni PostgreSQL.
- Nueva contratación inicializa renovación activada. Una contratación cancelada y vencida permite contratar otra vez el mismo plan.
- Los avisos de reservas y la sincronización programada de Google comprueban vigencia también al ejecutarse. Los correos de cuenta/seguridad siguen disponibles.

Comprobaciones nuevas aprobadas localmente:

- 41 tests seleccionados de web: Mercado Pago, franja, vigencia y recuperación (incluye firmas).
- 2 pruebas con PostgreSQL real en esquema local aislado: vencimiento y retiro/recuperación. Comprueban que cuentas con pago previo no se retiran, que la gracia de treinta días no se adelanta y que diseño, dirección y clientes se conservan.
- 1 recorrido Playwright completo con usuario efímero: login real, franja en escritorio/celular, lecturas y exportación con plan vencido, cuatro APIs de escritura respondiendo 403, Server Action de crear cliente bloqueada sin insertar, botón de recontratación habilitado y recuperación efectiva sólo después de activar Plus. Capturas revisadas: franja de unos 32 px en escritorio y 43 px en celular.
- Compilación de producción web, compilaciones API/worker, lint web y verificación de encabezados aprobados.
- Suite general web: 94 aprobados, 1 omitido y 1 fallo preexistente de cinemática del calendario (1000 frente a 500). No atribuirle un cierre completo de todas las pruebas de la aplicación. Ese resultado fue anterior al caso adicional de recontratación; la suite seleccionada ampliada sí se repitió.

Para repetir el navegador, en una terminal nueva con el mismo DATABASE_URL local aislado y PRUEBAS_VENCIMIENTO_MP=1:

```powershell
pnpm db:deploy
pnpm --filter @turnos/web exec playwright test --config=playwright.suscripcion.config.ts
```

El servidor de prueba usa un puerto independiente, clave local pública no productiva y no acepta la base remota ni reutiliza un servidor existente. Se eliminan exclusivamente los usuarios y negocios efímeros creados por cada ejecución. La base habitual local y Railway no fueron migradas; sólo el esquema aislado recibió las nuevas migraciones.

Antes de habilitar la nueva versión en producción, aplicar las migraciones nuevas con pnpm db:deploy contra Railway (predeploy del worker) y comprobar éxito. Luego verificar versiones de web, API y worker. Las migraciones son aditivas y conservan los datos; registran retiro y primer pago, más el índice del trabajo de retiro. El trabajo realiza una actualización filtrada por minuto, no una llamada por cuenta a Mercado Pago.

Pendiente en despliegue: navegación y restricciones con cuenta de prueba aislada vencida; suspensión y recuperación por subdominio real (DNS wildcard, HTTPS y PUBLIC_SITE_DOMAIN); revisión de nuevos eventos/errores en Railway. No basta con el recorrido local para dar por verificados DNS o producción. Railway ya volvió a funcionar según el usuario: retomar los pendientes anteriores, especialmente un reclamo interrumpido en PROCESANDO, antes de usar credenciales reales.

- Suite seleccionada de Mercado Pago en web: 27 tests aprobados, 0 fallos.
  Registro anterior a la ampliación de vigencia: los totales actuales figuran arriba.
- Suite completa de worker: 45 tests aprobados, 0 fallos (incluye pruebas de avisos existentes).
- Compilación de producción Next.js, compilación del worker, tipos de web y lint de archivos web modificados: aprobados.
- No se ejecutó aquí la suite completa de web ni pruebas de PostgreSQL real, navegador o despliegue. No se realizaron compras ni cambios en cuentas externas.
- Corrección encontrada por la cobertura ampliada: un fallo de conexión durante PUT de cambio de plan ahora redirige a facturacion=error, igual que una creación fallida, en vez de propagar la excepción.
