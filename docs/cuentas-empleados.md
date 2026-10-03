# Cuentas del equipo: funcionamiento y despliegue

## Qué cambia

Una cuenta personal puede trabajar en distintos negocios. Cada petición vuelve a comprobar el negocio elegido, la membresía, el rol, el profesional activo y sus sucursales. No se crean negocios ni pruebas gratuitas al aceptar una invitación. La funcionalidad no agrega cargos ni modifica los planes existentes.

El dueño invita desde **Equipo**, con un email opcional en el alta o edición del profesional, o desde su card. El worker entrega el mensaje mediante la bandeja existente de Resend. El enlace dura siete días y requiere aceptar con la cuenta verificada correspondiente. Abrirlo o enviar el correo no vincula una cuenta. Sólo después de aceptar aparece **Cuenta vinculada**.

Reenviar invalida el enlace anterior; cancelar invalida también los correos aún pendientes. Hay un máximo persistido de un envío por minuto y cinco por hora por profesional. Un correo que ya estaba en vuelo hacia Resend no puede retirarse, pero su enlace queda invalidado igualmente.

Quitar acceso revoca únicamente la membresía de ese negocio. Desactivar al profesional suspende el acceso y las nuevas reservas, conservando su ficha y los turnos futuros para que el dueño los resuelva. Restaurar una revocación requiere aceptar otra invitación.

El empleado accede a sus turnos, clientes vinculados, notas, cobros y reportes. No puede administrar Equipo, servicios, precios, productos, planes ni publicación del sitio. Administradores conservan la operación administrativa, pero tampoco pueden invitar ni editar el sitio. La cuenta personal y el selector están en **Mi cuenta**.

Inventario y compras son compartidos por sucursal. Una venta o consumo no permite stock negativo. Compra, existencias, caja y actividad se confirman juntos, con protección frente a reintentos. Las compras no se descuentan de los ingresos del empleado.

En el detalle del turno, **Registrar cobro** admite importes parciales y considera las señas aprobadas. Completar un turno no lo cobra. Los ingresos son cobros atribuidos, no sueldo ni comisión. Sólo el dueño puede anular nuevos registros trazables: se conserva el original, se pide un motivo y se genera un contramovimiento. Esto **no devuelve dinero mediante Mercado Pago**.

**Actividad** muestra los movimientos y su autor. El empleado ve compras y stock de sus locales, sus propias operaciones y acciones de otros integrantes sin importes, clientes ni conceptos privados. Los registros anteriores conservan su atribución disponible y autor desconocido; las notas antiguas no se atribuyen a empleados.

**Mi sitio** comparte el sitio del negocio con el profesional preseleccionado y ofrece un enlace por sucursal asignada. El visitante puede elegir otro profesional. No se crean nuevos diseños ni subdominios. El panel comprueba cambios cada diez segundos y al recuperar el foco; se pausa oculto y protege formularios/carritos en edición.

Las imágenes históricas de R2 y las imágenes públicas del sitio siguen siendo públicas. No se agregan adjuntos privados ni sesiones compartidas entre el dominio principal y los subdominios.

## Migración y bandera

Migración nueva: `20261003140000_cuentas_equipo`.

Es aditiva: incorpora invitaciones, aceptación de membresía, vínculos cliente–profesional, cobros de turnos, trazabilidad y versión de cambios. Vincula clientes atendidos en turnos confirmados, completados o ausentes, sin copiar notas históricas. No crea cuentas automáticamente.

Variable **privada de servidor en Vercel**:

```env
CUENTAS_EQUIPO_HABILITADAS=false
```

No usar `NEXT_PUBLIC_`. Ausente o distinta de `true` significa deshabilitada. Esta bandera bloquea nuevas invitaciones y aceptaciones; no revoca las cuentas ya incorporadas ni elimina datos.

La web necesita `WEB_URL` y `BETTER_AUTH_URL` del dominio principal, su secreto de autenticación y la misma base productiva. El worker necesita `RESEND_API_KEY`, `EMAIL_REMITENTE` y esa misma base. No mover la clave de Resend al navegador. No hay que cambiar las credenciales de Mercado Pago.

## Salida a producción

1. Conservar un respaldo comprobado de PostgreSQL antes del despliegue. Las pruebas locales no sustituyen este respaldo.
2. Mantener `CUENTAS_EQUIPO_HABILITADAS=false` en Vercel y desplegar el código completo, incluida la nueva versión de API y worker.
3. Ejecutar `pnpm db:deploy` en el proceso de migraciones de Railway **antes de servir la nueva web**. Regenerar Prisma con `pnpm db:generate` durante las compilaciones. El código nuevo requiere las columnas nuevas aunque la bandera esté apagada.
4. Confirmar la fila `20261003140000_cuentas_equipo` en `_prisma_migrations`, con `finished_at` no nulo y `rolled_back_at` nulo. Confirmar web Ready, API y worker Online. No actualizar Prisma a otra versión por el aviso informativo del instalador.
5. Habilitar temporalmente `CUENTAS_EQUIPO_HABILITADAS=true` en un **entorno de prueba separado** con web, API, worker y base propios. La bandera de esta versión es global, no por negocio: no habilitarla en producción general antes de validar el flujo.
6. Invitar un correo controlado desde un dueño, comprobar entrega real en Resend, registrar la cuenta, verificar su email, aceptar y comprobar la insignia. Probar un segundo correo con cuenta existente y reenviar/cancelar.
7. Con dos navegadores, comprobar agenda/clientes/importes propios, stock y compras compartidos, actividad filtrada, cambio de negocio, Google Calendar del profesional, formulario abierto, sólo lectura por vencimiento, revocación y desactivación sin borrar turnos.
8. Después de esas comprobaciones, habilitar `CUENTAS_EQUIPO_HABILITADAS=true` en Vercel productivo y redesplegar. No ejecutar los fixtures de pruebas contra Railway.

Si falla la entrega o aceptación, volver la bandera a `false`, investigar web/worker/Resend y conservar la migración y los datos. No eliminar columnas ni resetear la base. Volver a una versión vieja después de aceptar cuentas no es un rollback seguro: la versión anterior no aplica el aislamiento nuevo.

## Comprobaciones locales reproducibles

Requieren Docker/PostgreSQL local y un esquema aislado `equipo_prueba_*`; los fixtures rechazan bases remotas y producción.

```powershell
$env:DATABASE_URL='postgresql://turnos:turnos@localhost:5433/turnos_rapidos?schema=equipo_prueba_20261003'
$env:PRUEBAS_EQUIPO='1'
pnpm db:deploy
pnpm --filter @turnos/web exec tsx --test src/servicios/equipo.integracion.spec.ts
pnpm --filter @turnos/web exec playwright test --config playwright.equipo.config.ts
pnpm --filter @turnos/worker test
pnpm --filter @turnos/api test
pnpm lint
pnpm build
```

Las pruebas de navegador deshabilitan credenciales externas. Prueban invitación explícita, cuenta existente y registro nuevo, separación de roles y negocios, privacidad, rutas directas denegadas, stock compartido, sólo lectura, revocación y preselección pública. La verificación de email nueva se simula en la base; **su entrega real y Google OAuth real quedan en la validación previa a producción**.

La prueba de compatibilidad se ejecuta primero sobre las veinte migraciones anteriores, sembrando con `pruebas/compatibilidad-equipo.ts sembrar`, luego aplica la migración nueva y ejecuta `pruebas/compatibilidad-equipo.ts verificar`. Usa exclusivamente `equipo_prueba_compatibilidad_20261003` local y conserva sus datos de muestra para inspección. No ejecutar `sembrar` dos veces sobre ese mismo esquema.

La suite general de web tiene un fallo preexistente en `cinematica-hoja.spec.ts`: espera una duración de 500 ms, mientras `cinematica-hoja.ts` y las pruebas de su línea de tiempo usan 1.000 ms. No se cambió la animación para ocultar ese fallo.

### Estado de la verificación — 3 de octubre de 2026

- Compilación de los siete paquetes, revisión de tipos, lint y encabezados: aprobadas.
- Equipo en PostgreSQL aislado: 14 comprobaciones aprobadas. Operaciones anteriores del panel: 8 aprobadas. Compatibilidad desde las veinte migraciones anteriores: aprobada, sin alterar importes ni atribuir autores/notas antiguos.
- Worker: 46 pruebas aprobadas y 2 integraciones omitidas; API: 4 aprobadas; Google Calendar simulado: 8 aprobadas, incluyendo revocación durante el consentimiento.
- Web general: 107 aprobadas, 3 omitidas y el fallo preexistente de animación descrito arriba.
- Se comprobaron en navegador los cinco flujos principales en ejecuciones separadas: incorporación, cambio de negocio, registro nuevo, sitio con profesional preseleccionado y cobro parcial que contempla la seña sin volver a cobrar al completar.
- La última repetición conjunta y las nuevas comprobaciones del endpoint de configuración inicial quedan pendientes: Docker Desktop dejó de arrancar por un error interno de `dockerInference`, y PostgreSQL local dejó de responder. No se reseteó Docker, no se borraron sus volúmenes y no se usó Railway como reemplazo.

Antes de habilitar producción, recuperar Docker, repetir la suite completa de navegador y completar la entrega real de correo y OAuth en el entorno separado indicado arriba. La bandera continúa apagada por defecto.

## Seguridad y pendientes independientes

El aislamiento se aplica antes de consultar y serializar, incluidas agregaciones y exportaciones. Los callbacks de Google vuelven a comprobar el contexto antes de guardar la conexión. Se cerró el alta alternativa no autenticada de suscripciones en la API antigua. El enfoque utiliza denegación por defecto y validación por petición, como recomienda [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Continúan pendientes por separado la prueba de cobro real de Mercado Pago y las páginas generales de error/404. No se enviaron correos reales ni se desplegó esta funcionalidad desde estas pruebas locales.
