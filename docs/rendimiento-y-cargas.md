# Auditoría de tiempos de carga y loaders

Fecha: 17/09/2026. Entorno local de desarrollo con Next.js 15, Turbopack, Prisma 6 y PostgreSQL. No se aplicaron migraciones ni optimizaciones de consultas durante esta auditoría.

## Conclusión

La compilación de rutas bajo `next dev` explica la mayor parte de las demoras iniciales mostradas en los logs. No hay evidencia de que las consultas locales de PostgreSQL estén tardando segundos. El inicio de sesión original sí tiene una demora adicional no explicada solamente por compilación: no se reprodujo al probar el ingreso demo, que respondió en 448 ms.

Los loaders mejoran el feedback durante la espera; no aceleran el servidor. El mínimo visible solicitado agrega deliberadamente una pausa breve cuando la respuesta ya es rápida.

## Qué dicen los logs originales

| Ruta | Primera compilación | Primera respuesta | Respuesta posterior |
| --- | ---: | ---: | ---: |
| Precios | 3.900 ms | 3.990 ms | No informada |
| Acceso | 2.200 ms | 2.277 ms | No informada |
| Agenda | 5.300 ms | 5.498 ms | 125–146 ms |
| Inventario | 1.152 ms | 1.308 ms | 114–171 ms |
| Caja | 900 ms | 1.017 ms | 135 ms |
| Login email | 5.500 ms | 12.662 ms | No informada |

En estas páginas, aproximadamente el 87–98% de la primera respuesta corresponde a compilación. En el login quedan aproximadamente 7.162 ms además de la compilación; esa resta no identifica por sí sola qué etapa consumió el tiempo.

No corresponde usar estos números como benchmark de producción: allí las rutas se compilan antes de servirlas. Tampoco representan el tiempo total de imágenes, hidratación y recursos en el navegador.

## Mediciones realizadas

Script reproducible: `apps/web/scripts/auditar-rendimiento.ts`. Ejecutar desde `apps/web`:

```powershell
pnpm exec tsx scripts/auditar-rendimiento.ts
pnpm exec tsx scripts/auditar-rendimiento.ts --detallado
```

Solo hace lecturas, consulta catálogos de PostgreSQL, ejecuta EXPLAIN ANALYZE de SELECT y verifica una contraseña sintética sin utilizar cuentas. `--detallado` imprime metadatos de tablas, índices y relaciones, no credenciales. Requiere el `.env` del proyecto y el servidor local en el puerto 3000.

Se repitieron cinco veces las consultas y tres veces HTTP/scrypt. Última corrida, sin primera ejecución:

| Prueba | Tiempo observado |
| --- | ---: |
| SELECT 1 con conexión abierta | 0,37–0,54 ms |
| Membresía + negocio + suscripción | 1,23–1,45 ms |
| Reservas con cliente, profesional y servicios | 2,09–2,11 ms |
| Clientes con última reserva y contador | 1,67–2,02 ms |
| Movimientos del mes | 0,58–0,76 ms |
| Verificación scrypt de contraseña sintética | 41–44 ms |
| HTTP Precios | 103–117 ms |
| HTTP Acceso | 89–91 ms |

La primera conexión varió aproximadamente entre 17 y 57 ms entre corridas. Una corrida simultánea con análisis de código tuvo consultas de 3–10 ms: aun así, no son los segundos del problema original. EXPLAIN de tres consultas representativas tuvo ejecuciones de 0,03–0,05 ms. No son planes exactos de todos los SQL internos generados por Prisma.

El test de ingreso con la cuenta demo existente midió 448 ms desde el clic hasta la respuesta HTTP exitosa; incluye el procesamiento de interfaz de ese intervalo. No se utilizó ni modificó `admin@gmail.com`. Ese ingreso crea únicamente la sesión normal necesaria para verificar el flujo.

La muestra es pequeña: 2 negocios, 5 usuarios, 40 clientes, 60 reservas, 13 productos y 16 movimientos. No es una prueba de carga ni demuestra cómo responderá el sistema con miles de clientes o usuarios concurrentes. La base local puede diferir de una base remota de producción.

## Base de datos, índices y relaciones

Se verificaron los índices realmente instalados, no únicamente el schema: 109 índices, ninguno inválido. PostgreSQL informa 66 claves foráneas y todas están validadas. En la instantánea no había sesiones esperando locks: una conexión activa era la propia auditoría y 14 estaban idle esperando al cliente. Esto no descarta bloqueos en otro momento ni mide agotamiento de pool bajo concurrencia.

Aspectos correctos encontrados:

- Prisma Client reutilizado como singleton durante desarrollo; no se crea un pool por cada página.
- Consultas del panel restringidas al negocio autenticado.
- Lecturas independientes ejecutadas en paralelo con Promise.all.
- Claves foráneas para las relaciones y restricciones únicas en identidad/sesión/membresías.
- Reserva ya tiene índices por negocio/sede/fecha y negocio/profesional/fecha.
- Hay una exclusión GiST `Reserva_profesional_sin_solapamientos` para impedir turnos superpuestos de un profesional en estados activos. Debe conservarse: un índice B-tree no reemplaza esa protección.
- La clave única de Membresia `(usuarioId, negocioId)` ya sirve como índice con prefijo usuarioId. No hace falta duplicarla solamente para buscar un usuario.

Índices candidatos, sujetos a planes y datos de tamaño representativo:

| Modelo y columnas | Consulta que motivaría el índice |
| --- | --- |
| Reserva `(negocioId, inicio)` | Resumen, próximo turno y fechas sin filtrar sede/profesional |
| Reserva `(clienteId, inicio)` | Último turno por cliente y conteos/historial de sus reservas |
| MovimientoCaja `(negocioId, creadoEn)` | Caja y reportes del negocio completo por rango de fecha |
| Cliente `(negocioId, creadoEn)` | Listado paginado ordenado por creación |
| CuentaOAuth `(usuarioId)` | Relación usuario/cuentas que consulta la autenticación |

Los índices actuales con una columna intermedia sedeId/profesionalId no equivalen a uno ordenado directamente por negocioId y fecha. La agenda además consulta intervalos solapados (`inicio < hasta` y `fin > desde`); hay que medir ese plan exacto antes de elegir un B-tree, GiST u otro cambio.

No se agregaron indiscriminadamente índices a todas las relaciones: encarecen escrituras y ocupan espacio. Con tablas tan pequeñas un Sequential Scan suele ser una decisión adecuada de PostgreSQL, no evidencia de una falla.

Las FK validadas garantizan existencia de referencias; no demuestran por sí solas aislamiento de negocio en cada relación. Los controles de autorización y filtros por negocio siguen siendo necesarios.

## Mejoras concretas priorizadas

1. **Medir producción por separado.** Crear un build aislado y probar páginas/login fríos y calientes sin sobrescribir el `.next` del dev activo. Añadir métricas por fase de autenticación: recepción, consulta usuario/cuenta, verificación de contraseña y creación de sesión. No bajar la seguridad del hash para tapar la demora. El login verificado normal no necesita enviar correo: los callbacks de verificación/reset se disparan en sus propios flujos.
2. **Reducir el trabajo inicial del hero.** Las ocho fotos originales suman aproximadamente 17,3 MB y el carrusel solicita todas de forma eager. Next/Image optimiza la transferencia, por lo que 17,3 MB no es el peso efectivamente recibido. Aun así hay trabajo de optimización y solicitudes simultáneas evitables: priorizar la central, cargar vecinas y diferir las restantes; preparar WebP/AVIF y sizes adecuados. Verificar carga del primer frame y funcionamiento del carrusel tras el cambio.
3. **Eliminar lecturas duplicadas por request.** `panel/layout.tsx` y `panel-datos.service.ts` consultan por separado sesión y membresía. Centralizar contexto y deduplicarlo durante un único render con cache de React, sin compartir datos autenticados globalmente entre usuarios. En una navegación solo de contenido, el layout de Next puede reutilizarse, por lo que la duplicación no ocurre necesariamente en todas las navegaciones.
4. **Paginar listas.** Clientes, inventario y catálogos tienen findMany sin límite. Evitar que crezcan indefinidamente; usar búsqueda y paginación del servidor. El include de última reserva/_count no demuestra un N+1 por cliente en código, pero hay que observar sus SQL y añadir el índice adecuado con datos grandes.
5. **Traer únicamente lo utilizado.** Sustituir includes completos por select de campos necesarios. Equipo/configuración leen conexiones Google completas aunque solo necesitan estado; no hace falta recuperar tokens cifrados en esas vistas.
6. **Agregar caja en SQL.** La vista trae movimientos del día aunque las ventas recientes se retiraron de la interfaz; utilizar aggregate/groupBy para los totales que sí se muestran.
7. **Evaluar imports y fuentes con mediciones.** Se usan FullCalendar, iconos/MUI y varias familias de fuentes. Las librerías grandes y barrels pueden afectar compilación; Next ya optimiza algunos paquetes por defecto, por lo que no conviene agregar configuración redundante sin revisar la versión y un trace. Fira Sans carga 6 pesos normales y 6 itálicos, además de PT Serif y Doppio One: limitar a las variantes usadas. No retirarlas arbitrariamente, porque forman parte del diseño solicitado.

No se confirmó como causa el antivirus, el disco, una saturación de pool, una conexión remota o un N+1. Son hipótesis a medir si reaparece una demora prolongada. No se desactivó ninguna protección del equipo.

## Loaders implementados

- Landing (`/`): loader circular SVG con giro continuo, trazo progresivo y transición de colores de marca. Se muestra solo en la primera entrada de la sesión, durante la carga del documento y las fuentes, con una presencia mínima breve de 900 ms y salida fade de 420 ms. Las demás rutas públicas no muestran loader inicial; el ingreso conserva su loader propio al autenticar y entrar al panel.
- Ingreso/panel (actualizado el 20/09): calendario ilustrado SVG con hojas blancas, base de escritorio, dos aros, perspectiva y colores azul oscuro/celeste. Se presenta recto, sin inclinación lateral. Tamaño ampliado hasta 460 px en escritorio y 340 px en móvil, limitado por el espacio disponible. Comienza en el mes y año actuales, con el día de hoy seleccionado, y cada mes ocupa 500 ms de cinemática continua, sin pausa intermedia. La esquina inferior derecha se dobla mediante un recorte SVG curvado y su reverso sombreado; después la hoja se levanta con torsión y pasa hacia atrás desde los aros, mostrando el dorso. Una única línea de tiempo con requestAnimationFrame avanza sin reiniciarse al pasar de hoja y continúa indefinidamente mientras los datos estén pendientes, calculando también el año al cruzar diciembre. Las hojas mantienen su identidad y posición: la siguiente pasa al frente sin saltos, y la saliente se desvanece detrás antes de terminar el giro. Cuando la vista resuelta y sus fuentes están listas, termina únicamente el giro en curso (hasta 500 ms), selecciona el día correspondiente y dibuja el check; confirma y hace fade durante otros 500 ms. No hay un mínimo artificial ni un tope en noviembre: si carga a los dos segundos, confirma en el mes alcanzado; si tarda, sigue avanzando hasta que cargue. Reemplaza las cuatro agendas 3D anteriores, sin cambiar el loader de la landing.
- Aparece inmediatamente al enviar el login por email y permanece durante autenticación, redirección por primeros pasos y carga del panel. También aparece al entrar directamente o recargar una ruta del panel; no se repite al volver a Resumen desde otro módulo. Tras Google comienza dentro de la aplicación al regresar.
- La autorización de cierre proviene de un marcador montado dentro del contenido resuelto, más las fuentes y las esperas registradas. La URL y la respuesta exitosa del login no autorizan por sí solas el check. La animación terminada se notifica por separado mediante `onFinalizar`.
- Navegación interna: enlaces centralizados con Next Link y `useTransition`. Desde el clic se muestra el skeleton específico del destino, incluso antes de recibir su respuesta; se conserva el contenido anterior montado, oculto e inactivo. Sidebar, menú móvil y barra inferior siguen disponibles. El último destino elegido determina el skeleton, sin duración mínima artificial. Se reutilizan las mismas vistas en los `loading.tsx`, incluido Resumen con cuatro métricas, agenda y bloque lateral.
- Las vistas suspendidas del panel registran su espera para que no se descubra un skeleton antes de terminar el ingreso.
- El email de registro requiere verificación: no se fuerza una navegación al panel antes de verificar. Google conserva la señal de ingreso al volver de su redirección.
- Error de autenticación/conexión: se retira el loader y vuelve el formulario con su mensaje.
- Si hace falta configurar el negocio, el formulario de primeros pasos cancela la presentación al montarse. Los errores de módulos liberan la espera y presentan una vista con Reintentar.
- El contenido cubierto queda inert y se bloquea el scroll mientras el overlay está activo. Estado anunciado a lectores de pantalla. Por petición posterior del usuario, el calendario del panel se anima incluso cuando el dispositivo indica movimiento reducido: se retiraron tanto la pausa de JavaScript como las reglas CSS que lo dejaban inmóvil en enero. La landing conserva su comportamiento anterior de movimiento reducido. Sin JavaScript, el overlay se oculta, no se marca el contenido inert y se expone el HTML resuelto que React entrega en segmentos ocultos.
- Los loaders no descargan nuevas imágenes ni añaden librerías de animación.

Limitación: ningún loader del frontend puede aparecer antes de que el servidor entregue el primer HTML/JavaScript. La compilación fría sigue existiendo en desarrollo; no hay que confundir una animación con la resolución de esa compilación.

## Verificación

TypeScript y ESLint sin errores. La suite de carga se ejecuta en Chromium y WebKit: comprueba el orden de los meses recorridos, giro curvado sin cortes, confirmación temprana al cargar, espera en noviembre con respuesta retenida, error de credenciales/conexión, ingreso demo existente, recarga, skeleton antes de recibir el módulo, clics consecutivos, móvil/movimiento reducido y contenido sin JavaScript. También simula un error del componente de un módulo y verifica su recuperación con Reintentar. Las pruebas retienen respuestas reales sin modificar datos del negocio ni recrear la cuenta demo.

```powershell
# Desde apps/web. No usar test:e2e: ese script recrea la demo.
pnpm exec playwright test --config=playwright.carga.config.ts
```

No se ejecutó un build de producción sobre la salida del dev activo. OAuth Google real y carga concurrente de producción no fueron probados. El ingreso demo verifica la redirección de primeros pasos al panel; el formulario de un usuario sin negocio tiene su marcador de cancelación integrado, pero no se creó otra cuenta para probar ese caso de punta a punta.

## Prácticas contrastadas con documentación oficial

- [Next.js: optimización del entorno de desarrollo, compilación, imports y trazas](https://nextjs.org/docs/app/guides/local-development). La página actual puede describir Next 16; se aplicaron principios compatibles con el proyecto Next 15, no APIs nuevas.
- [Prisma 6: optimización de consultas, reutilización del cliente e índices](https://www.prisma.io/docs/orm/v6/prisma-client/queries/query-optimization-performance).
- [Prisma 6: configuración de índices](https://docs.prisma.io/docs/orm/v6/prisma-schema/data-model/indexes).
