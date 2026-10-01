# Mercado Pago: pruebas y pendientes de despliegue

## Alcance y límites

Las pruebas ejecutan el receptor, checkout, renovación y procesador reales, con sesiones, PostgreSQL y API simulados. No realizan cobros, no necesitan secretos reales y no modifican negocios existentes. El mock de persistencia reproduce unicidad/upsert, pero no demuestra las restricciones ni los bloqueos reales de PostgreSQL. Inspeccionar la consulta de reclamo no equivale a matar y recuperar un contenedor real.

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
- La mejora de sondeo cada cinco segundos y actualización visual necesita verificación después de desplegar la versión correspondiente.

## Pendientes: ejecutar después de aprobar las pruebas automatizadas

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

## Resultado local del 01/10/2026

- Suite seleccionada de Mercado Pago en web: 27 tests aprobados, 0 fallos.
- Suite completa de worker: 45 tests aprobados, 0 fallos (incluye pruebas de avisos existentes).
- Compilación de producción Next.js, compilación del worker, tipos de web y lint de archivos web modificados: aprobados.
- No se ejecutó aquí la suite completa de web ni pruebas de PostgreSQL real, navegador o despliegue. No se realizaron compras ni cambios en cuentas externas.
- Corrección encontrada por la cobertura ampliada: un fallo de conexión durante PUT de cambio de plan ahora redirige a facturacion=error, igual que una creación fallida, en vez de propagar la excepción.
